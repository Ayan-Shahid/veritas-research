"""memo status + updated_at, memo_versions, audit_log

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "memos", sa.Column("status", sa.String(20), nullable=False, server_default="draft")
    )
    op.add_column(
        "memos",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "memo_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "memo_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("memos.id"), nullable=False
        ),
        sa.Column("content", postgresql.JSON, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_memo_versions_memo_id", "memo_versions", ["memo_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=True
        ),
        sa.Column("details", postgresql.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_log_target_id", "audit_log", ["target_id"])
    op.create_index("ix_audit_log_company_id", "audit_log", ["company_id"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("memo_versions")
    op.drop_column("memos", "updated_at")
    op.drop_column("memos", "status")