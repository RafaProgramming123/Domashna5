#!/usr/bin/env bash
set -euo pipefail

echo "Deploying Prod environment..."

: "${GHCR_USER:?Must provide GHCR_USER}"
: "${GHCR_TOKEN:?Must provide GHCR_TOKEN}"

export GHCR_NAMESPACE="${GHCR_NAMESPACE:-$GHCR_USER}"

docker login ghcr.io -u "$GHCR_USER" -p "$GHCR_TOKEN"

docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans

echo "Prod deployment complete."

