# Deploying Veritas (single machine, Cloudflare Tunnel)

One public hostname, `https://veritas.ayandev.app`, reaches Caddy through the tunnel. Caddy routes:

| Path | Goes to |
| --- | --- |
| `/auth/v1/*` | GoTrue (self-hosted Supabase Auth), prefix stripped; `/auth/v1/admin/*` is blocked |
| `/api/*` | FastAPI, prefix stripped |
| everything else | Next.js |

Nothing publishes a host port. Postgres holds both the app tables and GoTrue's `auth` schema
(GoTrue creates and migrates that schema itself on start).

## How auth fits together

- The browser and the Next.js server actions use `@supabase/ssr` against GoTrue. Server actions
  reach it at `http://caddy` (`SUPABASE_INTERNAL_URL`) and forward the visitor's
  `CF-Connecting-IP`, so GoTrue's per-IP limits apply per visitor.
- The API checks the `Authorization: Bearer` access token (HS256, `JWT_SECRET`) and then asks
  Postgres whether that GoTrue session still exists (`auth_bridge.session_is_active`, created by
  `initdb/01-bootstrap.sh`). Sign-out, "sign out other devices" and password changes cut off API
  access at once. The app's DB role cannot read GoTrue's tables.
- Emails contain only a 6-digit code (no links), from `email-templates/`, rebuilt with
  `python3 deploy/build-email-templates.py`.

## First start

```bash
cd deploy
python3 gen-secrets.py            # writes .env (mode 600); never overwrites
# edit .env: fill every CHANGEME (AUTH_IMAGE, tunnel token, Anthropic key, Resend key, EDGAR UA)
python3 gen-secrets.py --check    # must print OK
docker compose --env-file .env up -d --build
docker compose ps                 # auth healthy, migrate exited 0, api healthy
```

`AUTH_IMAGE`: copy the tag from the `auth` service in Supabase's self-hosting compose file
(`supabase/gotrue:v2.196.0` when this was written and tested).

`initdb/01-bootstrap.sh` runs only on an empty Postgres volume. If you change it, or the first
start failed half-way, reset with `docker compose down -v` (deletes all data).

## Verify (GoTrue ignores misspelled variables silently, so check behaviour)

1. `curl -s https://veritas.ayandev.app/auth/v1/settings` shows `"anonymous_users":true`,
   `"email":true`, `"mailer_autoconfirm":false`.
2. `curl -s -o /dev/null -w '%{http_code}' https://veritas.ayandev.app/auth/v1/admin/users` prints `404`.
3. Open the site in a private window and go to `/companies`: the workspace loads as a guest.
4. Register: the code email arrives from `SMTP_ADMIN_EMAIL`, with no links; entering it and a
   password lands you on `/companies` with your email in the header.
5. Settings: a wrong current password is refused; a right one works and signs out other devices
   (a second browser signed in to the same account gets bounced to `/`).
6. Forgot password: the reset code email arrives and works.
7. `docker compose logs auth | grep -i error` is quiet.

## Tests for these files

```bash
python3 -m unittest discover -s deploy/tests          # gen-secrets
python3 deploy/build-email-templates.py --check       # templates up to date + rules
```
