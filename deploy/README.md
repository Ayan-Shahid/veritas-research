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

## CI/CD

A push to `main` runs `.github/workflows/ci-cd.yml`: tests → build backend/web images and
push to GHCR (`ghcr.io/<you>/veritas-backend`, `-web`) → the Mac pulls and restarts → old
image versions beyond the 10 most recent are pruned. Pull requests only run the test jobs.
Images are built in GitHub's cloud, not on the Mac — the backend image bakes a PyTorch wheel
and an embedding model, too heavy to redo on a 2018 machine on every push.

### One-time setup

1. **Self-hosted runner on the Mac.** GitHub → repo → Settings → Actions → Runners → New
   self-hosted runner → macOS, follow the download/configure commands it gives you (these
   change with GitHub's runner version, so use the dashboard's own copy-paste commands rather
   than an old copy of them). Install it as a service so it survives reboots and starts
   headless, same as everything else here:
   ```bash
   ./svc.sh install
   ./svc.sh start
   ```
2. **Move your secrets out of the git checkout.** The runner's working copy gets reset
   (untracked files deleted) before every job, which would otherwise wipe `deploy/.env`:
   ```bash
   mkdir -p ~/veritas-deploy-env
   mv deploy/.env ~/veritas-deploy-env/.env
   ```
   `deploy/deploy.sh` (what the workflow's deploy step runs) reads it from there.
3. **Repo variable + secret for the frontend build.** Next.js inlines `NEXT_PUBLIC_*` values
   into the JS bundle at build time, so they're supplied to the cloud build, not read from
   `deploy/.env` on the Mac. Settings → Secrets and variables → Actions:
   - Variable `DOMAIN` = `veritas.ayandev.app`
   - Secret `ANON_KEY` = the `ANON_KEY` line from `~/veritas-deploy-env/.env`

   Both must match `deploy/.env`'s values. If you ever regenerate secrets with
   `gen-secrets.py` (a new `JWT_SECRET` means a new `ANON_KEY`), update this repo secret too —
   otherwise the next deployed frontend image still has the old key baked in.
4. (Optional) Settings → Environments → create `production` and add required reviewers, since
   the workflow's deploy job targets an environment named `production` — this gets you a
   manual approval gate before anything reaches the Mac. Skip this and GitHub just creates the
   environment automatically with no restrictions on first use.

### Pruning

The `prune` job uses `actions/delete-package-versions`, keeping the 10 most recent image
versions per package and deleting the rest. It runs with the workflow's own `GITHUB_TOKEN`
(`packages: write`); if your account's default token permissions block package deletion,
create a PAT with the `delete:packages` scope, store it as a repo secret, and swap it in for
`secrets.GITHUB_TOKEN` in that job.

### What I verified vs. didn't

Verified on a real Postgres 16 + pgvector instance: all 14 Alembic migrations apply cleanly;
`npm run lint`, `npm run typecheck`, and `npm test` (frontend) all pass; 39 of 40 backend
pytest tests pass. **Not verified:** the actual GitHub-hosted build (no Docker daemon
available to me), the self-hosted runner registration flow, and GHCR package pruning
permissions on a real account.

**One pre-existing, unrelated test failure** this surfaced:
`tests/test_chunking.py::test_chunk_markdown_table_splits_long_tables_with_headers` fails —
it expects a long markdown table to split into 3 chunks at `max_chars=40` but
`chunk_markdown_table` currently produces 4 (the header lands in its own chunk instead of
packed with the first data row). This is in SEC-filing chunking, unrelated to auth or this
CI/CD setup, and was already broken before any of this work — but it means the very first run
of `test-backend` will fail on this, not on anything this patch changed. Worth fixing before
relying on the pipeline, or temporarily marking that one test `xfail` if you'd rather unblock
deploys first and fix the chunker later.
