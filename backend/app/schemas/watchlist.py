import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WatchlistItemCreate(BaseModel):
    company_id: uuid.UUID


class WatchlistCompanyRead(BaseModel):
    """A company as it appears in an org's watchlist, with the company
    fields flattened in rather than nested, since the frontend renders
    this as a single row."""

    model_config = ConfigDict(from_attributes=True)

    watchlist_item_id: uuid.UUID
    company_id: uuid.UUID
    ticker: str
    name: str
    sector: str | None
    added_at: datetime