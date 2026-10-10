import uuid

from pydantic import BaseModel, ConfigDict


class MeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    is_anonymous: bool
