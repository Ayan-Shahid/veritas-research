import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.models.company import Company
from app.models.user import User
from app.models.watchlist_item import WatchlistItem
from app.schemas.watchlist import WatchlistCompanyRead, WatchlistItemCreate

router = APIRouter()


@router.get("/watchlist", response_model=list[WatchlistCompanyRead])
async def list_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem, Company)
        .join(Company, Company.id == WatchlistItem.company_id)
        .where(WatchlistItem.organization_id == current_user.organization_id)
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


@router.post("/watchlist", response_model=WatchlistCompanyRead, status_code=201)
async def add_to_watchlist(
    payload: WatchlistItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = await db.get(Company, payload.company_id)
    # Ownership check on the company being added, not just its existence -
    # otherwise a user could watchlist a company_id belonging to another org.
    if not company or company.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Company not found")

    existing = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.organization_id == current_user.organization_id,
            WatchlistItem.company_id == payload.company_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Company already on watchlist")

    item = WatchlistItem(organization_id=current_user.organization_id, company_id=payload.company_id)
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


@router.delete("/watchlist/{company_id}", status_code=204)
async def remove_from_watchlist(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.organization_id == current_user.organization_id,
            WatchlistItem.company_id == company_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Company not on watchlist")

    await db.delete(item)
    await db.commit()