from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationRead
from app.schemas.user import MeRead

router = APIRouter()


@router.get("/users/me", response_model=MeRead)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await db.get(Organization, current_user.organization_id)
    return MeRead(
        id=current_user.id,
        email=current_user.email,
        is_anonymous=current_user.is_anonymous,
        organization=OrganizationRead.model_validate(org),
    )