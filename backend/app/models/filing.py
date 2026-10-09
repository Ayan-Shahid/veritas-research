import uuid
from datetime import datetime, date

from sqlalchemy import String, DateTime, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Filing(Base):
    __tablename__ = "filings"

    __table_args__ = (
        UniqueConstraint("organization_id", "accession_number", name="uq_filing_org_accession"),
    )


    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )
    accession_number: Mapped[str] = mapped_column(String(25), unique=True, nullable=False, index=True)
    form_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "10-K", "10-Q", ...
    filing_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_of_report: Mapped[date | None] = mapped_column(Date, nullable=True)
    primary_document_url: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
