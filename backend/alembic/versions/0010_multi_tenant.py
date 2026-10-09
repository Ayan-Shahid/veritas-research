"""multi-tenant: organization_id on core tables, user_id on jobs/audit_log

Revision ID: 0010_multi_tenant
Revises: <PASTE 0009's REVISION ID HERE>
Create Date: 2026-09-28

Wipes existing data first rather than backfilling ownership onto rows
that predate the concept of a tenant - this project is pre-launch and
already re-generating its memo set for the citation_order migration,
so there's no real ownership to preserve. If you ever need to run this
against a database with real users, do NOT run this as-is; write a
proper backfill (create one legacy Organization, assign it to every
orphaned row) instead of truncating.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # CASCADE handles FK dependency order regardless of the list order given.
    op.execute("""
        TRUNCATE audit_log, memo_versions, jobs, memos, filing_chunks,
                 filings, watchlist_items, companies, users, organizations
        RESTART IDENTITY CASCADE
    """)

    # --- users: drop custom-auth fields, add Supabase-mirroring fields ---
    op.drop_column("users", "hashed_password")
    op.drop_column("users", "is_active")
    op.drop_constraint("users_email_key", "users", type_="unique")  # email is no longer unique-enforced
    op.alter_column("users", "email", nullable=True)
    op.add_column("users", sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default="true"))
    op.alter_column("users", "is_anonymous", server_default=None)  # drop default after backfill-free add

    # --- companies: add organization_id, fix global-uniqueness bug ---
    op.add_column("companies", sa.Column("organization_id", UUID(as_uuid=True), nullable=False))
    op.create_foreign_key(
        "fk_companies_organization_id", "companies", "organizations",
        ["organization_id"], ["id"],
    )
    op.create_index("ix_companies_organization_id", "companies", ["organization_id"])
    op.drop_constraint("companies_ticker_key", "companies", type_="unique")
    op.drop_constraint("companies_cik_key", "companies", type_="unique")
    op.create_unique_constraint("uq_company_org_ticker", "companies", ["organization_id", "ticker"])
    op.create_unique_constraint("uq_company_org_cik", "companies", ["organization_id", "cik"])

    # --- filings: add organization_id, fix global-uniqueness bug ---
    op.add_column("filings", sa.Column("organization_id", UUID(as_uuid=True), nullable=False))
    op.create_foreign_key(
        "fk_filings_organization_id", "filings", "organizations",
        ["organization_id"], ["id"],
    )
    op.create_index("ix_filings_organization_id", "filings", ["organization_id"])
    op.drop_constraint("filings_accession_number_key", "filings", type_="unique")
    op.create_unique_constraint(
        "uq_filing_org_accession", "filings", ["organization_id", "accession_number"]
    )

    # --- filing_chunks: add organization_id (denormalized, for RLS/query convenience) ---
    op.add_column("filing_chunks", sa.Column("organization_id", UUID(as_uuid=True), nullable=False))
    op.create_foreign_key(
        "fk_filing_chunks_organization_id", "filing_chunks", "organizations",
        ["organization_id"], ["id"],
    )
    op.create_index("ix_filing_chunks_organization_id", "filing_chunks", ["organization_id"])

    # --- memos: add organization_id ---
    op.add_column("memos", sa.Column("organization_id", UUID(as_uuid=True), nullable=False))
    op.create_foreign_key(
        "fk_memos_organization_id", "memos", "organizations",
        ["organization_id"], ["id"],
    )
    op.create_index("ix_memos_organization_id", "memos", ["organization_id"])

    # --- jobs: add organization_id AND user_id (the acting analyst) ---
    op.add_column("jobs", sa.Column("organization_id", UUID(as_uuid=True), nullable=False))
    op.create_foreign_key(
        "fk_jobs_organization_id", "jobs", "organizations",
        ["organization_id"], ["id"],
    )
    op.create_index("ix_jobs_organization_id", "jobs", ["organization_id"])

    op.add_column("jobs", sa.Column("user_id", UUID(as_uuid=True), nullable=False))
    op.create_foreign_key("fk_jobs_user_id", "jobs", "users", ["user_id"], ["id"])
    op.create_index("ix_jobs_user_id", "jobs", ["user_id"])

    # --- audit_log: add the missing actor ---
    op.add_column("audit_log", sa.Column("user_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_audit_log_user_id", "audit_log", "users", ["user_id"], ["id"])
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_log_user_id", "audit_log")
    op.drop_constraint("fk_audit_log_user_id", "audit_log", type_="foreignkey")
    op.drop_column("audit_log", "user_id")

    op.drop_index("ix_jobs_user_id", "jobs")
    op.drop_constraint("fk_jobs_user_id", "jobs", type_="foreignkey")
    op.drop_column("jobs", "user_id")
    op.drop_index("ix_jobs_organization_id", "jobs")
    op.drop_constraint("fk_jobs_organization_id", "jobs", type_="foreignkey")
    op.drop_column("jobs", "organization_id")

    op.drop_index("ix_memos_organization_id", "memos")
    op.drop_constraint("fk_memos_organization_id", "memos", type_="foreignkey")
    op.drop_column("memos", "organization_id")

    op.drop_index("ix_filing_chunks_organization_id", "filing_chunks")
    op.drop_constraint("fk_filing_chunks_organization_id", "filing_chunks", type_="foreignkey")
    op.drop_column("filing_chunks", "organization_id")

    op.drop_constraint("uq_filing_org_accession", "filings", type_="unique")
    op.create_unique_constraint("filings_accession_number_key", "filings", ["accession_number"])
    op.drop_index("ix_filings_organization_id", "filings")
    op.drop_constraint("fk_filings_organization_id", "filings", type_="foreignkey")
    op.drop_column("filings", "organization_id")

    op.drop_constraint("uq_company_org_cik", "companies", type_="unique")
    op.drop_constraint("uq_company_org_ticker", "companies", type_="unique")
    op.create_unique_constraint("companies_cik_key", "companies", ["cik"])
    op.create_unique_constraint("companies_ticker_key", "companies", ["ticker"])
    op.drop_index("ix_companies_organization_id", "companies")
    op.drop_constraint("fk_companies_organization_id", "companies", type_="foreignkey")
    op.drop_column("companies", "organization_id")

    op.drop_column("users", "is_anonymous")
    op.alter_column("users", "email", nullable=False)
    op.create_unique_constraint("users_email_key", "users", ["email"])
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("hashed_password", sa.String(255), nullable=False, server_default=""))