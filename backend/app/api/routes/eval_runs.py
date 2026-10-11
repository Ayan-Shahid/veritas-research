from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth import get_registered_user
from app.models.eval_run import EvalRun
from app.schemas.eval_run import EvalRunRead

router = APIRouter()


@router.get("/eval-runs", response_model=list[EvalRunRead], dependencies=[Depends(get_registered_user)])
async def list_eval_runs(db: AsyncSession = Depends(get_db)):
    """History of eval harness runs, newest first — lets the frontend
    (or a quick glance at the API) show whether generation quality is
    improving or regressing across model/prompt changes.

    Signed-in, non-guest users only."""
    result = await db.execute(select(EvalRun).order_by(EvalRun.created_at.desc()))
    return result.scalars().all()
