"""add chunk_metadata to filing_chunks

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "filing_chunks",
        sa.Column(
            "chunk_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True
        )
    )


def downgrade() -> None:
    op.drop_column("filing_chunks", "chunk_metadata")