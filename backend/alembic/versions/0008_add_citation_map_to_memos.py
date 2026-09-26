"""add citation_map to memos

Revision ID: add_citation_map
Revises: DOWN_REVISION_ID_HERE
Create Date: 2026-09-25 12:50:50.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0008'
down_revision = '0007' # Replace with your previous migration ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add the JSONB column for storing the parent-hash to child-id mappings
    op.add_column(
        'memos',
        sa.Column('citation_map', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    # Remove the citation_map column if rolling back
    op.drop_column('memos', 'citation_map')