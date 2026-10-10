from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.user import MeRead

router = APIRouter()


@router.get("/users/me", response_model=MeRead)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
