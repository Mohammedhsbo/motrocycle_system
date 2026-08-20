# SPEC-015 Operations

This repository now supports isolated development, test, staging, and production configuration through `.env.*.example` files. Real `.env` files are ignored and must be supplied locally, by CI secrets, or by deployment host environment files.

## Local Startup

1. Copy `.env.development.example` to `.env`.
2. Run `docker compose up -d postgres redis minio`.
3. Run `pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, then start apps with their existing `dev` scripts.

PostgreSQL, Redis, and MinIO are bound to localhost for development. Production compose does not publish PostgreSQL or Redis ports.

## Health And Version

The API exposes:

- `/health/live`: process liveness plus safe version, git commit, and environment.
- `/health/ready`: database readiness.
- `/health/deps`: database, Redis, and object storage dependency state.
- `/metrics`: Prometheus text metrics for request count, latency sum, and uptime.

## Staging And Production Deployment

CI runs lint/typecheck/tests/builds, dependency audit, secret scan, Docker image build, and Trivy image scan. Main branch images are pushed to GHCR using the commit SHA tag.

Deployment flow is:

1. CI succeeds.
2. Staging deploy runs `deploy/scripts/deploy.sh staging`.
3. Staging health checks pass.
4. Production deploy waits for GitHub Environment approval.
5. Production deploy runs `deploy/scripts/deploy.sh production`.

Deployment scripts perform backup, advisory-locked `prisma migrate deploy`, application rollout, and health verification.

## Required External Inputs

Set these outside the repository:

- SSH deployment secrets for staging and production.
- `PUBLIC_DOMAIN`, `ADMIN_DOMAIN`, and `API_DOMAIN`.
- Real TLS certificates via Let's Encrypt mounted at `/etc/letsencrypt`.
- S3-compatible object storage credentials and bucket lifecycle/versioning settings.
- Optional CDN cache invalidation credentials.
- Optional desktop signing certificate secrets: `WINDOWS_SIGNING_CERTIFICATE_BASE64` and `WINDOWS_SIGNING_CERTIFICATE_PASSWORD`.

## Backups And Disaster Recovery

Targets: RTO 4 hours, RPO 1 hour.

PostgreSQL:

- Run `scripts/backup/postgres-backup.sh` at least hourly in production.
- Set `BACKUP_ENCRYPTION_PASSPHRASE` for encrypted backups.
- Set `BACKUP_OFFSITE_URI` for off-site upload when AWS CLI is available.
- Verify with `scripts/backup/verify-postgres-backup.sh`.
- Restore only to a deliberate target using `RESTORE_DATABASE_URL` and `scripts/restore/postgres-restore.sh`.
- Configure WAL archiving/PITR on managed PostgreSQL or host-level PostgreSQL for one-hour RPO.

Object storage:

- Enable bucket versioning and lifecycle retention in the storage provider.
- Keep public assets under the configured public prefix and private documents under the private prefix.
- Private documents must be served through presigned URLs only.

Redis:

- Redis uses AOF and RDB snapshots.
- Redis is cache/session/transport state only and is not authoritative business storage.
- Recovery is to restart Redis and let application state repopulate from PostgreSQL.

## Rollback

Application rollback uses immutable image tags:

```sh
deploy/scripts/rollback.sh <previous_git_sha>
```

Database rollback is not automatic. Migrations should be forward-compatible and additive. Use PITR/emergency restore only for confirmed data corruption, and restore into a separate target before promoting.

Frontend rollback is image-tag based for `web` and `admin`. Desktop rollback is by keeping previous GitHub releases and installer artifacts available. Backend API compatibility must be maintained for the currently supported previous desktop release.

## Secrets And Rotation

Never commit secrets. Rotate by:

1. Add the new secret to CI/deployment host.
2. Deploy with both old and new accepted where the integration supports overlap.
3. Revoke the old secret.
4. Confirm `/health/deps` and application login flows.

Rotate immediately after accidental exposure. Run gitleaks in CI and before release.

## Security Hardening

- Production CORS must be explicit and cannot use `*`.
- Nginx enforces HTTPS redirects, TLS 1.2+, HSTS, CSP, X-Frame-Options, Referrer-Policy, request size limits, gzip, and WebSocket upgrade headers.
- API container runs as UID 1001 with no new privileges, dropped capabilities, read-only filesystem, and tmpfs for `/tmp`.
- PostgreSQL and Redis are private-network only in production.
- SSH should disable password login, restrict users, use key authentication, and allow only ports 22, 80, and 443 publicly.
- Apply OS and container base-image patches on a regular maintenance window.

## Monitoring And Incident Response

Use `docker-compose.monitoring.yml` with the production compose stack to run Prometheus, Grafana, node-exporter, and cAdvisor. Alert externally on:

- API readiness failures.
- 5xx rate increases.
- high request latency.
- disk above 80%.
- PostgreSQL connection exhaustion or storage growth.
- Redis memory pressure.

Structured API logs include timestamp, level, service, request IDs, method, endpoint, status code, and duration. Do not log passwords, JWTs, API keys, payment secrets, or sensitive financial details.

## Desktop Release

Desktop releases are tagged as `desktop-vX.Y.Z`. The release workflow builds a Windows NSIS installer and publishes artifacts with generated release notes. Signing is enabled only when signing secrets are provided by CI.
