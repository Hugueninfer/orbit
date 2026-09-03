# Orbit operations

## Environments

New deployments use `APP_MODE=combined`: one application and one database. Personal accounts are persistent; each demo visitor has an expiring owner scope in that same database. Keep `OIDC_AUTHORITY` empty for built-in login. Existing single-purpose `personal`/`demo` deployments remain compatible. To upgrade, back up and select the personal database, set combined, then deploy; no merging/deletion of old databases is required. Test installations must still use separate disposable databases.

For optional local OIDC identity:

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

## Built-in personal account (default)

Set `APP_MODE=combined`, leave `OIDC_AUTHORITY` empty and set `ALLOWED_ORIGINS` to the application origin. For local HTTP only, set `SESSION_COOKIE_SECURE=false`; online requires `true` and HTTPS. After migrations and startup, run:

```sh
docker compose exec app python -m app.accounts create YOUR_EMAIL
# Recovery or password change (revokes all sessions):
docker compose exec app python -m app.accounts reset-password YOUR_EMAIL
```

`/demo` opens the public entry page on the same origin. Demo access is selected per tab; it sends only its bearer credential. Expiry and logout never restore a residual personal cookie. Logout of a demo revokes only that demo token. Demo reset and cleanup filter by expiring owner; real Telegram integration is restricted to personal accounts.

The CLI prompts twice without echoing the password. Choose 15–128 characters. No personal account, default password, public signup or email recovery is created automatically. Existing OIDC accounts are not silently linked by email. The online equivalent is `bash scripts/account-remote.sh IMAGE PRIVATE_ENV_FILE create YOUR_EMAIL`.

Passwords use scrypt N=131072/r=8/p=1 with a random salt. Seven-day session cookies are HttpOnly/SameSite=Strict/Secure online; their random tokens are hashed in PostgreSQL. Login allows 30 attempts/minute globally, with a 15-minute account lock after five failures. Password hashes are serialized using a database advisory lock to bound memory use. Rate-limit state survives restarts. Request origin plus `X-Orbit-CSRF: 1` is required on cookie-authenticated writes.

## Release

Publish the reviewed GitHub release and retain the verified image digest from its workflow summary. CI tests, saves and publishes that same image; the Render service references its digest. Back up, apply migrations once via the `migrate` service, then start/recreate app. On a managed free web service, run `scripts/migrate-remote.sh IMAGE PRIVATE_ENV_FILE` from the operator's machine before deploying; no unsupported paid pre-deploy hook is assumed.

Application rollback means running the previous compatible image. A database backup restore is a separate reviewed recovery operation. Never automatically downgrade destructive migrations.

## Backup and restore

```sh
./scripts/backup.sh orbit .env /secure/location/orbit-YYYY-MM-DD.dump
./scripts/restore-check.sh orbit .env /secure/location/orbit-YYYY-MM-DD.dump
```

Project and environment arguments are mandatory; `orbit .env` addresses the default combined installation. The dump contains personal and temporary demo tenants. Backups are atomically published with mode 600, refuse existing destinations and should be stored encrypted off-host. The check script creates a new temporary database, restores there, verifies the schema and removes only that temporary database. It never overwrites the live database. To recover production, create a fresh DB, restore a selected backup, verify owner rows and key transactions, and deliberately switch the app's connection string.

For managed PostgreSQL, save a separate private `.env.pg-personal` file with `PGHOST` (direct endpoint), `PGPORT=5432`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, and `PGSSLROOTCERT=system`, and `PGSSLMODE=verify-full` (or the provider's required verified TLS configuration). Run `./scripts/backup-remote.sh .env.pg-personal /secure/location/personal-YYYY-MM-DD.dump`. The database credential is passed through Docker's env file, not a command-line URL. Restore-check that dump into the local isolated database with the command above before relying on it. Never put backup dumps or private env files in Git.

A volume is persistence, not a backup. Set a retention schedule suited to your use; avoid retaining unbounded demo audit data.

## Scheduled work

The free core uses idempotent one-shot commands that a host scheduler can invoke:

```sh
docker compose exec -T app python -m app.jobs extend-recurrences --through YYYY-MM-DD
docker compose exec -T app python -m app.jobs cleanup-demo
```

Use an actual future date no more than 366 days ahead. Recurring occurrences are unique by recurrence/immutable scheduled date and protect occupied recurrence cycles, so reruns do not duplicate them. The UI also offers explicit horizon generation. Free sleeping hosts do not imply a continuous scheduler.

Telegram is optional. The current worker is a one-shot command (`python -m app.jobs telegram-worker`) consuming durable rows. Full live production support, retry/retention and conversation completion are tracked as limitations; do not enable it for personal financial automation before completing those gates.

## Monitoring

- `/health/live`: process responds.
- `/api/v1/health`: PostgreSQL readiness.
- `X-Request-ID`: correlates a response with structured runtime logs.
- JSON logs include route template, method, status and duration, not tokens or request bodies.
- Inspect `docker compose ps` and `docker stats --no-stream` for resource use.

No hosted tracing/OTLP exporter is configured. Data/control dependencies are local for the core.

## External publication

The repo and deploy artifacts do not create accounts, register domains or publish URLs. Configure one PostgreSQL database and combined service, create the personal account and validate the exact HTTPS origin, login/logout and mobile persistence. Verify that a demo in another tab cannot access or reset personal data. Record the public URL only after these checks pass.
