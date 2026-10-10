import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.api.deps import get_db, get_owned_company, get_owned_memo, get_owned_job
from app.core.auth import get_current_user
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.filing_chunk import FilingChunk
from app.models.job import Job
from app.models.memo import Memo
from app.models.memo_version import MemoVersion
from app.models.user import User
from app.schemas.memo import AuditLogRead, JobRead, MemoRead, MemoUpdate, MemoVersionRead
from app.tasks.memo_tasks import generate_memo_task

router = APIRouter()


@router.post("/companies/{company_id}/memos/generate", response_model=JobRead, status_code=202)
async def trigger_memo_generation(
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = Job(
        job_type="memo_generation",
        company_id=company.id,
        user_id=current_user.id,
        status="pending",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    generate_memo_task.delay(str(job.id))

    return job


@router.get("/jobs/{job_id}", response_model=JobRead)
async def get_job(job: Job = Depends(get_owned_job)):
    return job


@router.get("/companies/{company_id}/memos", response_model=list[MemoRead])
async def list_memos(
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Memo).where(Memo.company_id == company.id).order_by(Memo.created_at.desc())
    )
    return result.scalars().all()


@router.get("/memos/{memo_id}", response_model=MemoRead)
async def get_memo(memo: Memo = Depends(get_owned_memo)):
    return memo


@router.patch("/memos/{memo_id}", response_model=MemoRead)
async def update_memo(
    payload: MemoUpdate,
    memo: Memo = Depends(get_owned_memo),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.add(MemoVersion(memo_id=memo.id, content=memo.content))

    memo.content = payload.model_dump()
    db.add(
        AuditLog(
            action="memo_edited",
            target_type="memo",
            target_id=memo.id,
            company_id=memo.company_id,
            user_id=current_user.id,
        )
    )

    await db.commit()
    await db.refresh(memo)
    return memo


@router.get("/memos/{memo_id}/versions", response_model=list[MemoVersionRead])
async def list_memo_versions(
    memo: Memo = Depends(get_owned_memo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MemoVersion)
        .where(MemoVersion.memo_id == memo.id)
        .order_by(MemoVersion.created_at.desc())
    )
    return result.scalars().all()


@router.post("/memos/{memo_id}/approve", response_model=MemoRead)
async def approve_memo(
    memo: Memo = Depends(get_owned_memo),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _set_memo_status(memo, "approved", db, current_user)


@router.post("/memos/{memo_id}/reject", response_model=MemoRead)
async def reject_memo(
    memo: Memo = Depends(get_owned_memo),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _set_memo_status(memo, "rejected", db, current_user)


async def _set_memo_status(memo: Memo, status: str, db: AsyncSession, current_user: User) -> Memo:
    memo.status = status
    db.add(
        AuditLog(
            action=f"memo_{status}",
            target_type="memo",
            target_id=memo.id,
            company_id=memo.company_id,
            user_id=current_user.id,
        )
    )

    await db.commit()
    await db.refresh(memo)
    return memo


@router.get("/memos/{memo_id}/audit-log", response_model=list[AuditLogRead])
async def get_memo_audit_log(
    memo: Memo = Depends(get_owned_memo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.target_type == "memo", AuditLog.target_id == memo.id)
        .order_by(AuditLog.created_at.desc())
    )
    return result.scalars().all()


@router.get("/memos/{memo_id}/citations/{citation_id}")
async def get_memo_citation(
    citation_id: str,
    memo: Memo = Depends(get_owned_memo),
    db: AsyncSession = Depends(get_db),
):
    """Resolves a parent block citation hash into the actual SEC filing text."""
    if not memo.citation_map:
        raise HTTPException(status_code=404, detail="Memo or citations not found")

    child_ids = memo.citation_map.get(citation_id)
    if not child_ids:
        raise HTTPException(status_code=404, detail="Invalid citation ID")

    first_child_id = uuid.UUID(child_ids[0])
    chunk = await db.get(FilingChunk, first_child_id)

    if not chunk or not chunk.chunk_metadata:
        raise HTTPException(status_code=404, detail="Source chunk missing")

    return {
        "citation_id": citation_id,
        "source_url": chunk.chunk_metadata.get("source_url"),
        "sec_item_label": chunk.chunk_metadata.get("sec_item_label"),
        "content": chunk.chunk_metadata.get("parent_content", chunk.content)
    }


@router.delete("/memos/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memo(
    memo: Memo = Depends(get_owned_memo),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.add(
        AuditLog(
            action="memo_deleted",
            target_type="memo",
            target_id=memo.id,
            company_id=memo.company_id,
            user_id=current_user.id,
        )
    )

    await db.delete(memo)
    await db.commit()
    return None