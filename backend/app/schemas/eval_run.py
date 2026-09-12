import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EvalRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    eval_set_name: str
    model_name: str
    metrics: dict
    created_at: datetime