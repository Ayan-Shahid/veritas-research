from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationRead

router = APIRouter()

DEFAULT_ORG_SLUG = "default"


@router.get("/organizations", response_model=list[OrganizationRead])
async def list_organizations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organization).order_by(Organization.name))
    return result.scalars().all()


@router.post("/organizations", response_model=OrganizationRead, status_code=201)
async def create_organization(payload: OrganizationCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Organization).where(Organization.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Slug '{payload.slug}' already in use")

    org = Organization(**payload.model_dump())
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/organizations/default", response_model=OrganizationRead)
async def get_default_organization(db: AsyncSession = Depends(get_db)):
    """Get-or-create a single default org.

    Placeholder until real auth/multi-tenancy lands (Week 3-4). Lets
    the frontend and watchlist endpoints have a stable org_id to work
    against without a signup flow existing yet.
    """
    result = await db.execute(select(Organization).where(Organization.slug == DEFAULT_ORG_SLUG))
    org = result.scalar_one_or_none()
    if org:
        return org

    org = Organization(name="Default Research Team", slug=DEFAULT_ORG_SLUG)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org