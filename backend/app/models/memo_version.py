import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MemoVersion(Base):
    """A snapshot of a memo's content taken right before an edit
    overwrites it, so edit history is browsable without complicating
    Memo itself with a version number or diff logic."""

    __tablename__ = "memo_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    memo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("memos.id"), nullable=False, index=True
    )
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)