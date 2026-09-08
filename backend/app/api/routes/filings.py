import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.company import Company
from app.models.filing import Filing
from app.schemas.filing import FilingRead
from app.services.edgar import EdgarClient

router = APIRouter()


@router.get("/companies/{company_id}/filings", response_model=list[FilingRead])
async def list_filings(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = await db.execute(
        select(Filing).where(Filing.company_id == company_id).order_by(Filing.filing_date.desc())
    )
    return result.scalars().all()


@router.post("/companies/{company_id}/filings/sync", response_model=list[FilingRead])
async def sync_filings(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Pull recent 10-K/10-Q filing metadata for this company from SEC EDGAR.

    Week 1 scope: metadata only (accession number, form type, dates, doc URL).
    Fetching + chunking the actual document text lands in Week 2.
    """
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    client = EdgarClient()
    filings_data = await client.get_recent_filings(company.cik, forms=("10-K", "10-Q"), limit=8)

    created: list[Filing] = []
    for item in filings_data:
        existing = await db.execute(
            select(Filing).where(Filing.accession_number == item["accession_number"])
        )
        if existing.scalar_one_or_none():
            continue
        filing = Filing(company_id=company.id, **item)
        db.add(filing)
        created.append(filing)

    await db.commit()
    for f in created:
        await db.refresh(f)
    return created
