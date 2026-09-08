import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyRead

router = APIRouter()


@router.get("/companies", response_model=list[CompanyRead])
async def list_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).order_by(Company.ticker))
    return result.scalars().all()


@router.post("/companies", response_model=CompanyRead, status_code=201)
async def create_company(payload: CompanyCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Company).where(Company.ticker == payload.ticker.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Company {payload.ticker} already exists")

    data = payload.model_dump()
    data["ticker"] = data["ticker"].upper()
    company = Company(**data)
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/companies/{company_id}", response_model=CompanyRead)
async def get_company(company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
