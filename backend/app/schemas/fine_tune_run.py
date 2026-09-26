import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FineTuneRunCreate(BaseModel):
    dataset_version: str
    base_model: str
    hyperparams: dict
    status: str = "completed"
    adapter_path: str | None = None
    notes: str | None = None


class FineTuneRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_version: str
    base_model: str
    hyperparams: dict
    status: str
    adapter_path: str | None
    eval_run_id: uuid.UUID | None
    notes: str | None
    created_at: datetime