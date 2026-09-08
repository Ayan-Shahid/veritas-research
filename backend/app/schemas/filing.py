import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class FilingBase(BaseModel):
    accession_number: str
    form_type: str
    filing_date: date
    period_of_report: date | None = None
    primary_document_url: str


class FilingRead(FilingBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    ingested_at: datetime | None = None
    created_at: datetime
