import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Column widths in app/models/company.py; anything longer used to reach Postgres and 500.
TICKER_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,9}$")
CIK_RE = re.compile(r"^\d{1,10}$")


class CompanyBase(BaseModel):
    ticker: str
    name: str
    cik: str
    sic: str | None = None
    sector: str | None = None


class CompanyCreate(BaseModel):
    """Validated input for adding a company. Read models stay unconstrained so rows created before
    this validation existed still serialise."""

    ticker: str = Field(max_length=10)
    name: str = Field(min_length=1, max_length=255)
    cik: str = Field(max_length=10)
    sic: str | None = Field(default=None, max_length=10)
    sector: str | None = Field(default=None, max_length=100)

    @field_validator("ticker", mode="before")
    @classmethod
    def _ticker(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip().upper()
            if not TICKER_RE.fullmatch(v):
                raise ValueError("Ticker must be 1-10 letters, digits, '.' or '-' (e.g. AAPL, BRK.B)")
        return v

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @field_validator("cik", mode="before")
    @classmethod
    def _cik(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            if not CIK_RE.fullmatch(v):
                raise ValueError("CIK must be 1-10 digits (e.g. 0000320193)")
            v = v.zfill(10)  # SEC's canonical form, so 320193 and 0000320193 are the same company
        return v

    @field_validator("sic", "sector", mode="before")
    @classmethod
    def _blank_is_none(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
