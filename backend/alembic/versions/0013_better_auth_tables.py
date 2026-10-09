"""Better Auth tables (user, session, account, verification)

Hand-written so the production stack needs no auth CLI at deploy time. Ids are uuids
(auth config sets advanced.database.generateId = "uuid"), timestamps are timestamptz
(correct regardless of any process time zone). The `isAnonymous` column belongs to the
anonymous plugin. If you add Better Auth plugins that need tables or columns, add a new
migration for them.

Verify against the library on first setup (see the runbook): run
`npx @better-auth/cli migrate` against an empty scratch database and compare
`pg_dump --schema-only` with this migration's result.

Revision ID: 0013
Revises: 0012
"""
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

_UP = [
    '''
    CREATE TABLE "user" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        "emailVerified" boolean NOT NULL DEFAULT false,
        image text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "isAnonymous" boolean DEFAULT false
    )
    ''',
    '''
    CREATE TABLE "session" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "expiresAt" timestamptz NOT NULL,
        token text NOT NULL UNIQUE,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "ipAddress" text,
        "userAgent" text,
        "userId" uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE
    )
    ''',
    'CREATE INDEX session_user_id_idx ON "session" ("userId")',
    '''
    CREATE TABLE "account" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "userId" uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamptz,
        "refreshTokenExpiresAt" timestamptz,
        scope text,
        password text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
    ''',
    'CREATE INDEX account_user_id_idx ON "account" ("userId")',
    '''
    CREATE TABLE "verification" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier text NOT NULL,
        value text NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
    ''',
    'CREATE INDEX verification_identifier_idx ON "verification" (identifier)',
]


def upgrade() -> None:
    for stmt in _UP:
        op.execute(stmt)


def downgrade() -> None:
    for table in ("verification", "account", "session", "user"):
        op.execute(f'DROP TABLE IF EXISTS "{table}"')