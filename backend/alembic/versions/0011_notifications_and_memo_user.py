"""notifications table; memos.user_id

Revision ID: 0011
Revises: 0010
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("memos", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_memos_user_id", "memos", "users", ["user_id"], ["id"])
    op.create_index("ix_memos_user_id", "memos", ["user_id"])

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("memo_id", UUID(as_uuid=True), nullable=True),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", "notifications")
    op.drop_table("notifications")
    op.drop_index("ix_memos_user_id", "memos")
    op.drop_constraint("fk_memos_user_id", "memos", type_="foreignkey")
    op.drop_column("memos", "user_id")