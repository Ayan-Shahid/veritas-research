"""users.id may be re-keyed when a guest upgrades to a permanent account

Written for Better Auth, which gave a guest-turned-member a NEW user id. Auth
is now Supabase Auth (GoTrue), which converts a guest in place (same id), so
nothing re-keys users any more; ON UPDATE CASCADE is kept as harmless. Constraint
names are discovered, not assumed.

Revision ID: 0012
Revises: 0011
"""
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

_TABLES = ("memos", "jobs", "audit_log", "notifications")


def _rebuild(on_update: str) -> None:
    for table in _TABLES:
        op.execute(
            f"""
            DO $$
            DECLARE c record;
            BEGIN
              FOR c IN
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
                WHERE con.contype = 'f'
                  AND con.conrelid = '{table}'::regclass
                  AND con.confrelid = 'users'::regclass
                  AND a.attname = 'user_id'
              LOOP
                EXECUTE format('ALTER TABLE {table} DROP CONSTRAINT %I', c.conname);
              END LOOP;
            END $$;
            """
        )
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT fk_{table}_user_id "
            f"FOREIGN KEY (user_id) REFERENCES users (id) {on_update}"
        )


def upgrade() -> None:
    _rebuild("ON UPDATE CASCADE")


def downgrade() -> None:
    _rebuild("")