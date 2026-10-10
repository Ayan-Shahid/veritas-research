from app.core.database import get_db
import uuid
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.models.company import Company
from app.models.filing import Filing
from app.models.memo import Memo
from app.models.job import Job
from app.models.user import User



async def get_owned_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> type[Company]:
    company = await db.get(Company, company_id)
    # Same 404 whether the row doesn't exist or belongs to another user -
    # a 403 here would confirm to an attacker that the id is real, just
    # not theirs, which is a real (if minor) information leak.
    if not company or company.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


async def get_owned_filing(
    filing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> type[Filing]:
    filing = await db.get(Filing, filing_id)
    if not filing or filing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Filing not found")
    return filing


async def get_owned_memo(
    memo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> type[Memo]:
    memo = await db.get(Memo, memo_id)
    if not memo or memo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Memo not found")
    return memo


async def get_owned_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> type[Job]:
    job = await db.get(Job, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


__all__ = ["get_db", "get_owned_memo", "get_owned_job", "get_owned_company", "get_owned_filing"]
