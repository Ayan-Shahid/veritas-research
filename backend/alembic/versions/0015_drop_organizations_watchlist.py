"""Drop organizations and the watchlist; data is owned by users directly

Every user was provisioned with exactly one personal organization, so the org
layer was a 1:1 indirection. Ownership moves to user_id:

- companies, filings, filing_chunks gain user_id (backfilled from the user who
  owns the row's organization) and lose organization_id;
- memos.user_id is backfilled the same way and becomes NOT NULL;
- jobs and users lose organization_id;
- watchlist_items and organizations are dropped.

If an organization somehow had several users, its rows go to the earliest-created
one. Rows whose organization has no user at all cannot be assigned an owner; the
upgrade stops rather than deleting them, so they can be inspected first.

Revision ID: 0015
Revises: 0014
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None

# Earliest-created user per organization: the owner of that org's rows.
_OWNER_CTE = """
    WITH owner AS (
        SELECT DISTINCT ON (organization_id) organization_id, id AS user_id
        FROM users
        ORDER BY organization_id, created_at, id
    )
"""

_NEW_OWNER_TABLES = ("companies", "filings", "filing_chunks")
_ORG_TABLES = ("companies", "filings", "filing_chunks", "memos", "jobs")


def upgrade() -> None:
    for table in _NEW_OWNER_TABLES:
        op.add_column(table, sa.Column("user_id", UUID(as_uuid=True), nullable=True))

    for table in _NEW_OWNER_TABLES:
        op.execute(
            f"""{_OWNER_CTE}
            UPDATE {table} t SET user_id = owner.user_id
            FROM owner WHERE t.organization_id = owner.organization_id
            """
        )
    op.execute(
        f"""{_OWNER_CTE}
        UPDATE memos m SET user_id = owner.user_id
        FROM owner WHERE m.user_id IS NULL AND m.organization_id = owner.organization_id
        """
    )

    # Refuse to continue (and silently lose data) if any row is still ownerless.
    op.execute(
        """
        DO $$
        DECLARE n bigint;
        BEGIN
          SELECT (SELECT count(*) FROM companies WHERE user_id IS NULL)
               + (SELECT count(*) FROM filings WHERE user_id IS NULL)
               + (SELECT count(*) FROM filing_chunks WHERE user_id IS NULL)
               + (SELECT count(*) FROM memos WHERE user_id IS NULL)
            INTO n;
          IF n > 0 THEN
            RAISE EXCEPTION
              '0015: % row(s) belong to an organization with no user; assign or delete them first', n;
          END IF;
        END $$;
        """
    )

    for table in (*_NEW_OWNER_TABLES, "memos"):
        op.alter_column(table, "user_id", nullable=False)
    for table in _NEW_OWNER_TABLES:
        op.create_foreign_key(
            f"fk_{table}_user_id", table, "users", ["user_id"], ["id"], onupdate="CASCADE"
        )
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

    op.drop_table("watchlist_items")

    # Dropping the column also drops its FK, index and the composite unique
    # constraints built on it (uq_company_org_ticker, uq_filing_org_accession, ...).
    for table in (*_ORG_TABLES, "users"):
        op.drop_column(table, "organization_id")

    op.create_unique_constraint("uq_company_user_ticker", "companies", ["user_id", "ticker"])
    op.create_unique_constraint("uq_company_user_cik", "companies", ["user_id", "cik"])
    op.create_unique_constraint(
        "uq_filing_user_accession", "filings", ["user_id", "accession_number"]
    )

    op.drop_table("organizations")


def downgrade() -> None:
    # Recreate one personal organization per user (as the old provisioning did)
    # and hang every row back off its owner's organization. The watchlist comes
    # back empty.
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute(
        """
        INSERT INTO organizations (id, name, slug, created_at)
        SELECT id,
               COALESCE(NULLIF(split_part(email, '@', 1), ''), 'New Workspace'),
               'ws-' || left(id::text, 8) || '-' || substr(md5(id::text), 1, 6),
               COALESCE(created_at, now())
        FROM users
        """
    )

    op.add_column("users", sa.Column("organization_id", UUID(as_uuid=True), nullable=True))
    op.execute("UPDATE users SET organization_id = id")
    op.alter_column("users", "organization_id", nullable=False)
    op.create_foreign_key(
        "users_organization_id_fkey", "users", "organizations", ["organization_id"], ["id"]
    )

    for table in _ORG_TABLES:
        op.add_column(table, sa.Column("organization_id", UUID(as_uuid=True), nullable=True))
        op.execute(
            f"UPDATE {table} t SET organization_id = u.organization_id "
            f"FROM users u WHERE t.user_id = u.id"
        )
        op.alter_column(table, "organization_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table}_organization_id", table, "organizations", ["organization_id"], ["id"]
        )
        op.create_index(f"ix_{table}_organization_id", table, ["organization_id"])

    op.drop_constraint("uq_filing_user_accession", "filings", type_="unique")
    op.drop_constraint("uq_company_user_cik", "companies", type_="unique")
    op.drop_constraint("uq_company_user_ticker", "companies", type_="unique")
    op.create_unique_constraint("uq_company_org_ticker", "companies", ["organization_id", "ticker"])
    op.create_unique_constraint("uq_company_org_cik", "companies", ["organization_id", "cik"])
    op.create_unique_constraint(
        "uq_filing_org_accession", "filings", ["organization_id", "accession_number"]
    )

    for table in _NEW_OWNER_TABLES:
        op.drop_index(f"ix_{table}_user_id", table)
        op.drop_constraint(f"fk_{table}_user_id", table, type_="foreignkey")
        op.drop_column(table, "user_id")
    op.alter_column("memos", "user_id", nullable=True)

    op.create_table(
        "watchlist_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False
        ),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("organization_id", "company_id", name="uq_watchlist_org_company"),
    )
    op.create_index("ix_watchlist_items_organization_id", "watchlist_items", ["organization_id"])
    op.create_index("ix_watchlist_items_company_id", "watchlist_items", ["company_id"])
