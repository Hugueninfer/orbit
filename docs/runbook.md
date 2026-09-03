# Orbit operations

## Environments

Use separate Compose project names and private env files to isolate volumes. Do not change a demo deployment into the personal database. The demo expires; personal mode uses OIDC and persistent users.

For local personal identity:

1. Copy `.env.example` to `.env.personal` and set:
   - `APP_MODE=personal`, `PORT=8082`
   - a separate `POSTGRES_PASSWORD`
   - `OIDC_AUTHORITY=http://localhost:8081/realms/orbit`
   - `OIDC_JWKS_URL=http://keycloak:8081/realms/orbit/protocol/openid-connect/certs`
   - `OIDC_CLIENT_ID=orbit-web`, `OIDC_AUDIENCE=orbit-api`
   - `ALLOWED_ORIGINS=http://localhost:8082`
   - a private `KEYCLOAK_ADMIN_PASSWORD`
2. `docker compose -p orbit-personal --env-file .env.personal --profile identity up -d --build --wait`
3. Open Keycloak at http://localhost:8081, sign in as admin using your configured admin password, select the Orbit realm, and create your local test user. Set a password and clear required actions as appropriate for a local account. The application never stores this password.
4. Open http://localhost:8082 and select **Entrar no Orbit**. Login redirects to Keycloak with PKCE, then returns to the app.

Keycloak's `start-dev` and HTTP are **local-only**. For public use, use managed HTTPS OIDC or a production Keycloak installation. Root Compose binds ports to loopback. Online mobile access requires an HTTPS host; the Render guide supplies that deployment path.

## Release

Build and retain the immutable image tag/digest. Back up, apply migrations once via the `migrate` service, then start/recreate app. On a managed free web service, run `scripts/migrate-remote.sh IMAGE PRIVATE_ENV_FILE` from the operator's machine before deploying; no unsupported paid pre-deploy hook is assumed.

Application rollback means running the previous compatible image. A database backup restore is a separate reviewed recovery operation. Never automatically downgrade destructive migrations.

## Backup and restore

```sh
./scripts/backup.sh /secure/location/orbit-YYYY-MM-DD.dump
./scripts/restore-check.sh /secure/location/orbit-YYYY-MM-DD.dump
```

Backups use mode 600 under the current umask and should be stored encrypted off-host. The check script creates a new temporary database, restores there, verifies the schema and removes only that temporary database. It never overwrites the live database. To recover production, create a fresh DB, restore a selected backup, verify owner rows and key transactions, and deliberately switch the app's connection string.

A volume is persistence, not a backup. Set a retention schedule suited to your use; avoid retaining unbounded demo audit data.

## Scheduled work

The free core uses idempotent one-shot commands that a host scheduler can invoke:

```sh
docker compose exec -T app python -m app.jobs extend-recurrences --through YYYY-MM-DD
docker compose exec -T app python -m app.jobs cleanup-demo
```

Use an actual future date no more than 366 days ahead. Recurring occurrences are unique by recurrence/date, so reruns do not duplicate them. The UI also offers explicit horizon generation. Free sleeping hosts do not imply a continuous scheduler.

Telegram is optional. The current worker is a one-shot command (`python -m app.jobs telegram-worker`) consuming durable rows. Full live production support, retry/retention and conversation completion are tracked as limitations; do not enable it for personal financial automation before completing those gates.

## Monitoring

- `/health/live`: process responds.
- `/api/v1/health`: PostgreSQL readiness.
- `X-Request-ID`: correlates a response with structured runtime logs.
- JSON logs include route template, method, status and duration, not tokens or request bodies.
- Inspect `docker compose ps` and `docker stats --no-stream` for resource use.

No hosted tracing/OTLP exporter is configured. Data/control dependencies are local for the core.

## External publication

The repo and deploy artifacts do not create accounts, register domains or publish URLs. Configure separate personal/demo PostgreSQL and OIDC, then validate actual HTTPS origins/callbacks and a reload/persistence journey. Keep demo reset disabled in personal mode. Record public URLs only after these checks pass.
