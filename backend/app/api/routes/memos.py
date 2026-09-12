import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.audit_log import AuditLog
from app.models.company import Company
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