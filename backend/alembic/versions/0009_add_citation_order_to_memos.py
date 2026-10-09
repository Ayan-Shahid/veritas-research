"""add citation_order to memos

Revision ID: 0009_add_citation_order
Revises: <PASTE THE REVISION ID OF YOUR 0008 (citation_map) MIGRATION HERE>
Create Date: 2026-09-27

Adds citation_order: preserves the exact first-seen chunk_pairs order
from deduplicate_parent_chunks at generation time, since Postgres
jsonb does not guarantee citation_map's key order survives a
storage/retrieval round-trip - export_training_data.py needs the
real order to reconstruct a prompt that matches what the model was
actually conditioned on when it produced the stored completion.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "memos",
        sa.Column("citation_order", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("memos", "citation_order")