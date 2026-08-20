# SPEC-015 Checklist

- TASK-001: env templates and local/test/staging/production isolation.
- TASK-002: production API Dockerfile, non-root UID 1001, healthcheck, graceful shutdown.
- TASK-003: private PostgreSQL, persistent storage, migration lock, backup-before-migrate workflow.
- TASK-004: private Redis, auth, AOF/RDB persistence, memory/eviction policy.
- TASK-005: S3-compatible env separation, public/private prefixes, presigned private URLs, MIME and size validation.
- TASK-006: nginx HTTPS proxy with security headers, request limits, WebSocket upgrade.
- TASK-007: GitHub Actions CI for backend/frontend/desktop, scans, Docker builds.
- TASK-008: staged CD with production environment approval and rollback script.
- TASK-009: web/admin image deployment with public-only frontend env variables.
- TASK-010: Windows desktop release workflow and installer artifact.
- TASK-011: ignored env files, CI/deployment secrets, rotation docs, gitleaks scan.
- TASK-012: structured logs, health, metrics, Prometheus/Grafana overlay, frontend/desktop error hooks.
- TASK-013: backup, restore, verification scripts and DR docs with RTO/RPO.
- TASK-014: private networks, hardened containers/proxy/CORS, security scan.
- TASK-015: rollback and release tagging docs/scripts.
- TASK-016: `scripts/deploy/validate-infra.mjs`, Docker/compose validation, focused build/typecheck commands.
