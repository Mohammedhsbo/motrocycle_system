#!/usr/bin/env sh
set -eu

ROLLBACK_TAG="${1:?usage: rollback.sh IMAGE_TAG}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

export IMAGE_TAG="$ROLLBACK_TAG"
echo "Rolling application images back to ${IMAGE_TAG}"
docker compose -f "$COMPOSE_FILE" pull api web admin
docker compose -f "$COMPOSE_FILE" up -d --no-deps api web admin
./scripts/health/check-health.sh "${HEALTHCHECK_URL:-https://${API_DOMAIN}/health/ready}"
echo "Rollback completed. Database rollback is not automatic; use PITR only for emergency data recovery."
