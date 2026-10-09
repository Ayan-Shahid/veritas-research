#!/bin/bash
# Runs ONCE, as the superuser, when the Postgres volume is first initialised (the official
# image runs /docker-entrypoint-initdb.d/* only on an empty data directory). To re-run it,
# remove the volume: `docker compose down -v` (this deletes all data).
#
# Creates:
#   - the pgvector extension (needs a superuser, so the app role doesn't have to be one)
#   - `veritas`: the app's role (FastAPI, Celery, Alembic); owns the database, not a superuser
#   - `supabase_auth_admin`: the role GoTrue logs in as; owns the `auth` schema and migrates it
#     itself on start-up. Adapted from Supabase's own init SQL (docker/volumes/db/roles.sql).
#   - `auth_bridge.session_is_active()`: lets the API ask "is this GoTrue session still live?"
#     without being able to read GoTrue's tables (password hashes, refresh tokens).
#
# No `set -e`: the image's entrypoint may source this file. ON_ERROR_STOP makes psql fail fast.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v app_pw="$APP_DB_PASSWORD" -v auth_pw="$AUTH_DB_PASSWORD" <<'SQL'
SELECT :'app_pw' = '' OR :'auth_pw' = '' AS missing_pw \gset
\if :missing_pw
  DO $$ BEGIN RAISE EXCEPTION 'APP_DB_PASSWORD and AUTH_DB_PASSWORD must both be set'; END $$;
\endif

CREATE EXTENSION IF NOT EXISTS vector;

-- App role. Created only if missing, so a POSTGRES_USER=veritas setup also works.
SELECT format('CREATE ROLE veritas LOGIN PASSWORD %L', :'app_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veritas') \gexec
ALTER DATABASE :"DBNAME" OWNER TO veritas;
-- PG15+: public schema belongs to pg_database_owner, i.e. veritas after the line above.

-- GoTrue's roles, as in Supabase's own init SQL. Its access tokens carry role=authenticated
-- (anon/service_role for the API keys); the app checks that claim, not Postgres grants.
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION PASSWORD :'auth_pw';
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT CREATE ON DATABASE :"DBNAME" TO supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path = 'auth';

-- Session check for the API (app/core/auth.py). auth.sessions doesn't exist yet (GoTrue creates
-- it on first start), so skip body validation now; the function resolves it when called.
-- Owned by supabase_auth_admin, which owns auth.sessions; callable only by veritas.
CREATE SCHEMA auth_bridge AUTHORIZATION supabase_auth_admin;
SET check_function_bodies = off;
CREATE FUNCTION auth_bridge.session_is_active(sid uuid, uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM auth.sessions s
        WHERE s.id = sid AND s.user_id = uid
          AND (s.not_after IS NULL OR s.not_after > now())
    )
$fn$;
RESET check_function_bodies;
ALTER FUNCTION auth_bridge.session_is_active(uuid, uuid) OWNER TO supabase_auth_admin;
REVOKE ALL ON FUNCTION auth_bridge.session_is_active(uuid, uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA auth_bridge TO veritas;
GRANT EXECUTE ON FUNCTION auth_bridge.session_is_active(uuid, uuid) TO veritas;
SQL
