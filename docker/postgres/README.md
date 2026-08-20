PostgreSQL is deployed only on the private Docker network in production. Do not publish port 5432 from `docker-compose.prod.yml`.

Use `deploy/scripts/migrate-with-lock.sh` for deployment migrations. The script takes a backup, acquires a PostgreSQL advisory lock, runs `prisma migrate deploy`, and releases the lock.
