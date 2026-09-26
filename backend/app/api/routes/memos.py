import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.api.deps import get_db
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.filing_chunk import FilingChunk
from app.models.job import Job
from app.models.memo import Memo
from app.models.memo_version import MemoVersion
from app.schemas.memo import AuditLogRead, JobRead, MemoRead, MemoUpdate, MemoVersionRead
from app.tasks.memo_tasks import generate_memo_task

router = APIRouter()


@router.post("/companies/{company_id}/memos/generate", response_model=JobRead, status_code=202)
async def trigger_memo_generation(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Enqueue memo generation and return immediately with a job to poll.

    Generation involves a vector search plus an LLM call — several
    seconds, sometimes more — so this hands back a job_id rather than
    holding the HTTP request open. Poll GET /jobs/{id} for status.
    """
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    job = Job(job_type="memo_generation", company_id=company_id, status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)

    generate_memo_task.delay(str(job.id))

    return job


@router.get("/jobs/{job_id}", response_model=JobRead)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/companies/{company_id}/memos", response_model=list[MemoRead])
async def list_memos(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Memo).where(Memo.company_id == company_id).order_by(Memo.created_at.desc())
    )
    return result.scalars().all()


@router.get("/memos/{memo_id}", response_model=MemoRead)
async def get_memo(memo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    memo = await db.get(Memo, memo_id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    return memo


@router.patch("/memos/{memo_id}", response_model=MemoRead)
async def update_memo(memo_id: uuid.UUID, payload: MemoUpdate, db: AsyncSession = Depends(get_db)):
    """Edit a memo's content.

    The content being replaced is snapshotted into memo_versions
    first, so the edit is recoverable — this is a full-content
    replace, not a patch of individual fields, matching how the
    frontend editor round-trips the whole thesis/highlights/risks
    blob.
    """
    memo = await db.get(Memo, memo_id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")

    db.add(MemoVersion(memo_id=memo.id, content=memo.content))

    memo.content = payload.model_dump()
    db.add(
        AuditLog(
            action="memo_edited",
            target_type="memo",
            target_id=memo.id,
            company_id=memo.company_id,
        )
    )

    await db.commit()
    await db.refresh(memo)
    return memo


@router.get("/memos/{memo_id}/versions", response_model=list[MemoVersionRead])
async def list_memo_versions(memo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    memo = await db.get(Memo, memo_id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")

    result = await db.execute(
        select(MemoVersion)
        .where(MemoVersion.memo_id == memo_id)
        .order_by(MemoVersion.created_at.desc())
    )
    return result.scalars().all()


@router.post("/memos/{memo_id}/approve", response_model=MemoRead)
async def approve_memo(memo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _set_memo_status(memo_id, "approved", db)


@router.post("/memos/{memo_id}/reject", response_model=MemoRead)
async def reject_memo(memo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _set_memo_status(memo_id, "rejected", db)


async def _set_memo_status(memo_id: uuid.UUID, status: str, db: AsyncSession) -> Memo:
    memo = await db.get(Memo, memo_id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")

    memo.status = status
    db.add(
        AuditLog(
            action=f"memo_{status}",
            target_type="memo",
            target_id=memo.id,
            company_id=memo.company_id,
        )
    )

    await db.commit()
    await db.refresh(memo)
    return memo


@router.get("/memos/{memo_id}/audit-log", response_model=list[AuditLogRead])
async def get_memo_audit_log(memo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    memo = await db.get(Memo, memo_id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")

    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.target_type == "memo", AuditLog.target_id == memo_id)
        .order_by(AuditLog.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{memo_id}/citations/{citation_id}")
async def get_memo_citation(memo_id: uuid.UUID, citation_id: str, db: AsyncSession = Depends(get_db)):
    """Resolves a parent block citation hash into the actual SEC filing text."""
    memo = await db.get(Memo, memo_id)
    if not memo or not memo.citation_map:
        raise HTTPException(status_code=404, detail="Memo or citations not found")

    # 1. Look up the list of child chunk IDs tied to this parent hash
    child_ids = memo.citation_map.get(citation_id)
    if not child_ids:
        raise HTTPException(status_code=404, detail="Invalid citation ID")

    # 2. Fetch just the first child chunk (since all children in this list share the exact same parent_content)
    first_child_id = uuid.UUID(child_ids[0])
    chunk = await db.get(FilingChunk, first_child_id)

    if not chunk or not chunk.chunk_metadata:
        raise HTTPException(status_code=404, detail="Source chunk missing")

    # 3. Return the full parent context to highlight in the UI
    return {
        "citation_id": citation_id,
        "source_url": chunk.chunk_metadata.get("source_url"),
        "sec_item_label": chunk.chunk_metadata.get("sec_item_label"),
        "content": chunk.chunk_metadata.get("parent_content", chunk.content)
    }


@router.delete("/memos/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memo(memo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Deletes a memo and logs the action to the audit trail."""
    memo = await db.get(Memo, memo_id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")

    # Record the deletion in the audit log before removing the record
    db.add(
        AuditLog(
            action="memo_deleted",
            target_type="memo",
            target_id=memo.id,
            company_id=memo.company_id,
        )
    )

    await db.delete(memo)
    await db.commit()
    return None