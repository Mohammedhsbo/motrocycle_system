#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
LOCK_ID="${MIGRATION_LOCK_ID:-150150}"

echo "Creating pre-migration backup"
./scripts/backup/postgres-backup.sh

echo "Acquiring PostgreSQL advisory migration lock ${LOCK_ID}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT pg_advisory_lock(${LOCK_ID});"
trap 'psql "$DATABASE_URL" -c "SELECT pg_advisory_unlock('"${LOCK_ID}"');" >/dev/null 2>&1 || true' EXIT INT TERM

pnpm db:migrate:deploy
pnpm db:generate

echo "Migration finished"
