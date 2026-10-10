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
export GHCR_OWNER="${GHCR_OWNER:-ayanshahid255}"

if [ ! -f "$ENV_FILE" ]; then
    echo "error: $ENV_FILE not found. Move your generated .env there first (see the comment above)." >&2
    exit 1
fi

cd "$(dirname "$0")"
docker compose --env-file "$ENV_FILE" pull
docker compose --env-file "$ENV_FILE" up -d
docker image prune -f

echo "Deployed GHCR_OWNER=$GHCR_OWNER IMAGE_TAG=$IMAGE_TAG"
