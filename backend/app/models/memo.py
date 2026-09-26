import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Memo(Base):
    __tablename__ = "memos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    # "draft" | "approved" | "rejected". A memo starts as "draft" the
    # moment generation succeeds and moves once an analyst reviews it —
    # see app/api/routes/memos.py for the approve/reject endpoints.
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    # The structured memo (thesis, financial_highlights, risks — see
    # schemas/memo.py for the shape) plus the chunk ids retrieval
    # selected, stored as JSON rather than normalized tables since
    # this is generation output we replace wholesale, not something
    # queried piece-by-piece.
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source_chunk_ids: Mapped[list] = mapped_column(JSONB, nullable=False)

    # NEW: Maps LLM parent hashes (e.g., 'sec-a1b2c3d4') to lists of child chunk UUIDs
    citation_map: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )