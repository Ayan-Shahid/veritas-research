#!/usr/bin/env bash
# Pulls freshly published images and restarts the production stack. Called by the "deploy"
# job in .github/workflows/ci-cd.yml; safe to run by hand on the Mac too (it just redeploys
# whatever IMAGE_TAG you give it, defaulting to :latest).
#
# Secrets live OUTSIDE this git checkout on purpose: actions/checkout resets the workspace
# (including deleting untracked files) before every run, which would otherwise wipe deploy/.env.
#   mkdir -p ~/veritas-deploy-env && mv deploy/.env ~/veritas-deploy-env/.env   # one-time move
set -euo pipefail

ENV_FILE="${VERITAS_ENV_FILE:-$HOME/veritas-deploy-env/.env}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"
# GHCR (and Docker generally) requires an all-lowercase repository name. The workflow passes
# GHCR_OWNER straight from github.repository_owner, which preserves the account's exact-case
# login (e.g. "Ayan-Shahid") — lowercase it here so it matches the image names build-and-push
# actually pushed (it lowercases independently before building/pushing).
export GHCR_OWNER="$(echo "${GHCR_OWNER:-ayan-shahid}" | tr '[:upper:]' '[:lower:]')"

if [ ! -f "$ENV_FILE" ]; then
    echo "error: $ENV_FILE not found. Move your generated .env there first (see the comment above)." >&2
    exit 1
fi

cd "$(dirname "$0")"
docker compose --env-file "$ENV_FILE" pull
docker compose --env-file "$ENV_FILE" up -d
docker image prune -f

echo "Deployed GHCR_OWNER=$GHCR_OWNER IMAGE_TAG=$IMAGE_TAG"
