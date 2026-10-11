from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth import get_registered_user, require_service_token
from app.models.fine_tune_run import FineTuneRun
from app.schemas.fine_tune_run import FineTuneRunCreate, FineTuneRunRead

router = APIRouter()


@router.post(
    "/fine-tune-runs",
    response_model=FineTuneRunRead,
    status_code=201,
    dependencies=[Depends(require_service_token)],
)
async def create_fine_tune_run(payload: FineTuneRunCreate, db: AsyncSession = Depends(get_db)):
    """Registers a fine-tuning run after the fact.

    Called by scripts/record_finetune_run.py over HTTP rather than a
    direct DB write, since the training run itself typically happens
    on a GPU box with no network path to Postgres — only to this API.
    Requires the X-Service-Token header (SERVICE_API_TOKEN), not a user session.
    """
    run = FineTuneRun(**payload.model_dump())
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


@router.get("/fine-tune-runs", response_model=list[FineTuneRunRead], dependencies=[Depends(get_registered_user)])
async def list_fine_tune_runs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FineTuneRun).order_by(FineTuneRun.created_at.desc()))
    return result.scalars().all()