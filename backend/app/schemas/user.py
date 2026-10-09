import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.organization import OrganizationRead


class MeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    is_anonymous: bool
    organization: OrganizationRead