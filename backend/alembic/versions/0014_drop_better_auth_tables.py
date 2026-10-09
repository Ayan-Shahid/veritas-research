"""Drop the Better Auth tables: auth moved to self-hosted Supabase Auth (GoTrue)

GoTrue keeps its users and sessions in its own `auth` schema, created and migrated by
the GoTrue container itself, so nothing replaces these tables here. Any rows in them
belong to Better Auth users that do not exist in GoTrue (fresh start).

Revision ID: 0014
Revises: 0013
"""
import importlib.util
from pathlib import Path

from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

_TABLES = ("verification", "account", "session", "user")  # children first


def upgrade() -> None:
    for table in _TABLES:
        op.execute(f'DROP TABLE IF EXISTS public."{table}"')


def downgrade() -> None:
    # Re-create exactly what 0013 created (empty).
    path = Path(__file__).with_name("0013_better_auth_tables.py")
    spec = importlib.util.spec_from_file_location("_rev_0013", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.upgrade()
