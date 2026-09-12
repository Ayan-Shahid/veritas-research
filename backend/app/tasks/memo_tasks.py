"""Celery task: retrieve top-k chunks for a company, generate a memo
draft with Claude, strip any citation that doesn't trace back to a
retrieved chunk, persist the result, and update the Job row so the
API can report status via polling.

Runs in a sync Celery worker (see app/core/celery_app.py), so it uses
the sync engine/session, not the async ones the FastAPI app uses.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.sync_database import SyncSessionLocal
from app.models.company import Company
from app.models.filing_chunk import FilingChunk
from app.models.job import Job
from app.models.memo import Memo
from app.services.cache import get_cached_chunk_ids, set_cached_chunk_ids
from app.services.embeddings import embed_text
from app.services.grounding import strip_invalid_citations
from app.services.llm import generate_memo_draft
from app.services.retrieval import build_top_chunks_query
from app.models.audit_log import AuditLog
# A single fixed retrieval query rather than per-section queries —
# the model is asked for the whole memo (thesis + highlights + risks)
# in one JSON response, so retrieval casts one broad net rather than
# running the vector search multiple times per job.
RETRIEVAL_QUERY = (
    "business overview, revenue growth, profitability, margins, "
    "competitive position, and principal risk factors"
)


@celery_app.task(name="app.tasks.memo_tasks.generate_memo_task", bind=True)
def generate_memo_task(self, job_id: str) -> None:
    with SyncSessionLocal() as db:
        job = db.get(Job, uuid.UUID(job_id))
        if job is None:
            return

        job.status = "running"
        job.celery_task_id = self.request.id
        db.commit()

        try:
            company = db.get(Company, job.company_id)
            if company is None:
                raise ValueError(f"Company {job.company_id} not found")

            chunks = _retrieve_chunks(db, job.company_id)
            if not chunks:
                raise ValueError(
                    "No ingested filing chunks for this company — sync and ingest "
                    "a filing before generating a memo."
                )

            chunk_pairs = [(str(c.id), c.content) for c in chunks]
            valid_ids = {cid for cid, _ in chunk_pairs}

            draft = generate_memo_draft(company.name, company.ticker, chunk_pairs)
            cleaned, invalid_count = strip_invalid_citations(draft, valid_ids)

            memo = Memo(
                company_id=job.company_id,
                model_name=settings.ANTHROPIC_MODEL,
                content=cleaned.model_dump(),
                source_chunk_ids=list(valid_ids),
            )
            db.add(memo)
            db.flush()

            db.add(memo)
            db.flush()

            db.add(
                AuditLog(
                    action="memo_generated",
                    target_type="memo",
                    target_id=memo.id,
                    company_id=job.company_id,
                    details={"job_id": str(job.id), "model_name": settings.ANTHROPIC_MODEL},
                )
            )

            job.memo_id = memo.id

            job.memo_id = memo.id
            job.status = "succeeded"
            if invalid_count:
                job.error = (
                    f"{invalid_count} citation(s) referenced an unretrieved chunk "
                    "and were dropped"
                )

            db.commit()
        except Exception as exc:  # noqa: BLE001 - reported on the job row, not just logs
            db.rollback()
            job.status = "failed"
            job.error = str(exc)[:2000]
            db.commit()


def _retrieve_chunks(db, company_id: uuid.UUID) -> list[FilingChunk]:
    cached_ids = get_cached_chunk_ids(company_id)
    if cached_ids:
        stmt = select(FilingChunk).where(
            FilingChunk.id.in_([uuid.UUID(i) for i in cached_ids])
        )
        chunks = list(db.execute(stmt).scalars().all())
        # A cache hit only counts if every cached id still resolves.
        # Ingestion is delete-then-recreate, so a chunk can't have been
        # individually deleted since — this just guards a stale/partial
        # cache entry from a race with an in-flight re-ingest.
        if len(chunks) == len(cached_ids):
            return chunks

    query_embedding = embed_text(RETRIEVAL_QUERY)
    stmt = build_top_chunks_query(company_id, query_embedding, settings.MEMO_RETRIEVAL_TOP_K)
    chunks = list(db.execute(stmt).scalars().all())

    set_cached_chunk_ids(company_id, [str(c.id) for c in chunks])
    return chunks