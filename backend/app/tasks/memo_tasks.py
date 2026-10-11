"""Celery task: retrieve top-k chunks for a company, generate a memo
draft with Claude, strip any citation that doesn't trace back to a
retrieved chunk, persist the result, and update the Job row so the
API can report status via polling.

Runs in a sync Celery worker (see app/core/celery_app.py), so it uses
the sync engine/session, not the async ones the FastAPI app uses.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.sync_database import SyncSessionLocal
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.filing_chunk import FilingChunk
from app.models.job import Job
from app.models.memo import Memo
from app.models.notification import Notification
from app.services.cache import get_cached_chunk_ids, set_cached_chunk_ids
from app.services.embeddings import embed_text
from app.services.grounding import strip_invalid_citations
from app.services.llm import generate_memo_draft
from app.services.retrieval import build_top_chunks_query
from app.services.retrieval import deduplicate_parent_chunks

logger = logging.getLogger(__name__)


class MemoJobError(Exception):
    """A failure whose message is written for the user and safe to show via GET /jobs/{id}.
    Anything else is logged and reported with a generic message."""


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

        company_label = "this company"  # fallback if the company lookup itself fails
        try:
            company = db.get(Company, job.company_id)
            if company is None:
                raise MemoJobError("The company for this job no longer exists.")
            company_label = company.name

            chunks = _retrieve_chunks(db, job.company_id)
            if not chunks:
                raise MemoJobError("No ingested filing chunks for this company. Ingest a filing first.")

            chunk_pairs, hash_to_children = deduplicate_parent_chunks(chunks)
            valid_ids = set(hash_to_children.keys())
            source_chunk_ids = [cid for children in hash_to_children.values() for cid in children]
            citation_order = [cid for cid, _ in chunk_pairs]

            draft = generate_memo_draft(company.name, company.ticker, chunk_pairs)
            cleaned, invalid_count = strip_invalid_citations(draft, valid_ids)

            memo = Memo(
                company_id=job.company_id,
                user_id=job.user_id,
                model_name=settings.ANTHROPIC_MODEL,
                content=cleaned.model_dump(),
                citation_map=hash_to_children,
                source_chunk_ids=source_chunk_ids,
                citation_order=citation_order,
            )
            db.add(memo)
            db.flush()

            db.add(
                AuditLog(
                    user_id=job.user_id,
                    action="memo_generated",
                    target_type="memo",
                    target_id=memo.id,
                    company_id=job.company_id,
                    details={"job_id": str(job.id), "model_name": settings.ANTHROPIC_MODEL},
                )
            )

            job.memo_id = memo.id
            job.status = "succeeded"
            if invalid_count:
                job.error = (
                    f"{invalid_count} citation(s) referenced an unretrieved chunk "
                    "and were dropped"
                )

            db.add(
                Notification(
                    user_id=job.user_id,
                    job_id=job.id,
                    kind="job_succeeded",
                    memo_id=memo.id,
                    message=f"Memo ready for {company.name}",
                )
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            job.status = "failed"
            if isinstance(exc, MemoJobError):
                job.error = str(exc)
            else:
                logger.exception("Memo generation job %s failed", job.id)
                job.error = "Memo generation failed. Try again, and check the server logs if it keeps failing."
            db.add(
                Notification(
                    user_id=job.user_id,
                    job_id=job.id,
                    kind="job_failed",
                    message=f"Memo generation failed for {company_label}"[:500],
                )
            )
            db.commit()


def _retrieve_chunks(db, company_id: uuid.UUID) -> list[FilingChunk]:
    cached_ids = get_cached_chunk_ids(company_id)
    if cached_ids:
        stmt = select(FilingChunk).where(
            FilingChunk.id.in_([uuid.UUID(i) for i in cached_ids])
        )
        chunks = list(db.execute(stmt).scalars().all())
        if len(chunks) == len(cached_ids):
            return chunks

    # Partitioned Retrieval: Split TOP_K evenly between Financials and Risks
    half_k = settings.MEMO_RETRIEVAL_TOP_K // 2

    # Query 1: Financials
    fin_emb = embed_text("Financial statements, income statement, balance sheet, net interest income, cash flows")
    stmt_fin = build_top_chunks_query(company_id, fin_emb, half_k)
    financial_chunks = list(db.execute(stmt_fin).scalars().all())

    # Query 2: Risks
    risk_emb = embed_text("Material risk factors, credit risk, market volatility, liquidity, regulatory concerns")
    stmt_risk = build_top_chunks_query(company_id, risk_emb, half_k)
    risk_chunks = list(db.execute(stmt_risk).scalars().all())

    # Combine and deduplicate at the child chunk level to prevent identical overlaps
    combined_chunks = list({c.id: c for c in financial_chunks + risk_chunks}.values())

    set_cached_chunk_ids(company_id, [str(c.id) for c in combined_chunks])
    return combined_chunks