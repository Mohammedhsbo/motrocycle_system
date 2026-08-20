import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "Dockerfile.api",
  "Dockerfile.web",
  "Dockerfile.admin",
  "docker-compose.yml",
  "docker-compose.prod.yml",
  "docker/nginx/templates/default.conf.template",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  "deploy/scripts/migrate-with-lock.sh",
  "scripts/backup/postgres-backup.sh",
  "scripts/restore/postgres-restore.sh",
  "docs/operations/SPEC-015-OPERATIONS.md",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing infrastructure files: ${missing.join(", ")}`);
  process.exit(1);
}

const prodCompose = readFileSync("docker-compose.prod.yml", "utf8");
if (/5432:5432|6379:6379/.test(prodCompose)) {
  console.error("Production compose must not publish PostgreSQL or Redis ports");
  process.exit(1);
}

const nginx = readFileSync("docker/nginx/templates/default.conf.template", "utf8");
for (const token of ["Strict-Transport-Security", "proxy_set_header Upgrade", "ssl_protocols TLSv1.2 TLSv1.3"]) {
  if (!nginx.includes(token)) {
    console.error(`nginx config missing ${token}`);
    process.exit(1);
  }
}

console.log("Infrastructure validation passed");
