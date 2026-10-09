import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    kind: str
    memo_id: uuid.UUID | None = None
    message: str
    read_at: datetime | None = None
    created_at: datetime