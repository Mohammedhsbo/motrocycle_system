#!/usr/bin/env sh
set -eu

ENVIRONMENT="${1:?usage: deploy.sh staging|production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

case "$ENVIRONMENT" in
  staging|production) ;;
  *) echo "Environment must be staging or production" >&2; exit 2 ;;
esac

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${REGISTRY_IMAGE_API:?REGISTRY_IMAGE_API is required}"
: "${REGISTRY_IMAGE_WEB:?REGISTRY_IMAGE_WEB is required}"
: "${REGISTRY_IMAGE_ADMIN:?REGISTRY_IMAGE_ADMIN is required}"

echo "Deploying ${ENVIRONMENT} tag ${IMAGE_TAG}"
docker compose -f "$COMPOSE_FILE" pull api web admin
./deploy/scripts/migrate-with-lock.sh
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans api web admin nginx
./scripts/health/check-health.sh "${HEALTHCHECK_URL:-https://${API_DOMAIN}/health/ready}"
echo "Deployment verified for ${IMAGE_TAG}"
