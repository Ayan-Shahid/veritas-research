import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    """Mirrors a Supabase Auth user. id is NOT generated here - it's
    set explicitly to match auth.users.id (the JWT 'sub' claim) the
    first time this user is seen, so this table can be joined against
    without ever touching Supabase's own auth schema. No password
    field: Supabase Auth owns credentials entirely.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    # Denormalized from the JWT/Supabase profile - convenient for display
    # and joins without an Admin API call; not the source of truth for auth.
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    # Mirrors the JWT's is_anonymous claim at last sync, so routes that
    # care (e.g. gating a feature to permanent accounts only) don't need
    # to re-decode the token. Refresh this on every request in the auth
    # dependency, not just at creation - it flips false after conversion.
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)