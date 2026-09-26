import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FilingChunkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filing_id: uuid.UUID
    chunk_index: int
    content: str
    chunk_metadata: dict | None = None
    created_at: datetime


class IngestResult(BaseModel):
    filing_id: uuid.UUID
    chunks_created: int
    total_characters: int