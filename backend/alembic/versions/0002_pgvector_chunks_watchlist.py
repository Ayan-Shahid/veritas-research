"""pgvector extension, filing_chunks, watchlist_items

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

EMBEDDING_DIM = 384  # sentence-transformers/all-MiniLM-L6-v2


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "filing_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "filing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("filings.id"), nullable=False
        ),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_filing_chunks_filing_id", "filing_chunks", ["filing_id"])

    # HNSW over ivfflat: no "train on existing rows first" caveat, so
    # it's safe to create against an empty table on day one.
    op.execute(
        "CREATE INDEX ix_filing_chunks_embedding_hnsw "
        "ON filing_chunks USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_table(
        "watchlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id"),
            nullable=False,
        ),
        sa.Column(
            "company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False
        ),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("organization_id", "company_id", name="uq_watchlist_org_company"),
    )
    op.create_index("ix_watchlist_items_organization_id", "watchlist_items", ["organization_id"])
    op.create_index("ix_watchlist_items_company_id", "watchlist_items", ["company_id"])


def downgrade() -> None:
    op.drop_table("watchlist_items")
    op.drop_index("ix_filing_chunks_embedding_hnsw", table_name="filing_chunks")
    op.drop_table("filing_chunks")
    op.execute("DROP EXTENSION IF EXISTS vector")