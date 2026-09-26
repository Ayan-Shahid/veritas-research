"""fine_tune_runs table

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fine_tune_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_version", sa.String(255), nullable=False),
        sa.Column("base_model", sa.String(255), nullable=False),
        sa.Column("hyperparams", postgresql.JSON, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="completed"),
        sa.Column("adapter_path", sa.String(500), nullable=True),
        sa.Column(
            "eval_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("eval_runs.id"), nullable=True
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("fine_tune_runs")