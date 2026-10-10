import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("user_id", "ticker", name="uq_company_user_ticker"),
        UniqueConstraint("user_id", "cik", name="uq_company_user_cik"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", onupdate="CASCADE"), nullable=False, index=True
    )
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cik: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    sic: Mapped[str | None] = mapped_column(String(10), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)