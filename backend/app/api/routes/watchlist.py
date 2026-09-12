import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.company import Company
from app.models.organization import Organization
from app.models.watchlist_item import WatchlistItem
from app.schemas.watchlist import WatchlistCompanyRead, WatchlistItemCreate

router = APIRouter()


async def _get_org_or_404(org_id: uuid.UUID, db: AsyncSession) -> Organization:
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/organizations/{org_id}/watchlist", response_model=list[WatchlistCompanyRead])
async def list_watchlist(org_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_org_or_404(org_id, db)

    result = await db.execute(
        select(WatchlistItem, Company)
        .join(Company, Company.id == WatchlistItem.company_id)
        .where(WatchlistItem.organization_id == org_id)
        .order_by(Company.ticker)
    )

    return [
        WatchlistCompanyRead(
            watchlist_item_id=item.id,
            company_id=company.id,
            ticker=company.ticker,
            name=company.name,
            sector=company.sector,
            added_at=item.added_at,
        )
        for item, company in result.all()
    ]


@router.post(
    "/organizations/{org_id}/watchlist", response_model=WatchlistCompanyRead, status_code=201
)
async def add_to_watchlist(
    org_id: uuid.UUID, payload: WatchlistItemCreate, db: AsyncSession = Depends(get_db)
):
    await _get_org_or_404(org_id, db)

    company = await db.get(Company, payload.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    existing = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.organization_id == org_id,
            WatchlistItem.company_id == payload.company_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Company already on watchlist")

    item = WatchlistItem(organization_id=org_id, company_id=payload.company_id)
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return WatchlistCompanyRead(
        watchlist_item_id=item.id,
        company_id=company.id,
        ticker=company.ticker,
        name=company.name,
        sector=company.sector,
        added_at=item.added_at,
    )


@router.delete("/organizations/{org_id}/watchlist/{company_id}", status_code=204)
async def remove_from_watchlist(org_id: uuid.UUID, company_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await _get_org_or_404(org_id, db)

    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.organization_id == org_id,
            WatchlistItem.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Company not on watchlist")

    await db.delete(item)
    await db.commit()