# Orbit API

FastAPI / SQLAlchemy 2 / psycopg 3 / PostgreSQL 18. Python 3.14 is the container target; Python >=3.12 supports local tooling. Dependencies are resolved in `uv.lock`.

```sh
cd backend
uv sync --frozen
export APP_MODE=combined
export DATABASE_URL=postgresql+psycopg://orbit:password@localhost:5432/orbit_demo
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Production startup does not create or mutate database schema. Apply Alembic as a separate release step. `GET /health/live` checks the process; `/api/v1/health` checks PostgreSQL. Interactive API docs: `/api/docs`; typed contract: `/api/v1/openapi.json`. The root runtime wraps the API to serve the web artifact.

Combined mode (the default) and personal mode use built-in email/password when `OIDC_AUTHORITY` is empty. Create the account with `python -m app.accounts create EMAIL`; recovery uses `reset-password` and revokes sessions. Passwords use scrypt and seven-day opaque sessions use HttpOnly cookies. Public HTTPS deployments require `SESSION_COOKIE_SECURE=true` and exact `ALLOWED_ORIGINS`. OIDC remains optional with issuer/client/audience settings and standard discovery. `APP_MODE=combined` supports personal accounts and temporary demo tenants in one database. Owner-scoped access, role-scoped reset/cleanup and explicit bearer precedence protect personal data. Separate `demo` and `personal` modes remain available for existing installations.

`API.md` describes all commands, response fields, accounting policies, and the optional Telegram milestone's limits.

## Persistence and concurrency

27 relational tables plus Alembic history. Core dates are SQL DATE, technical timestamps TIMESTAMPTZ, money BIGINT, weight NUMERIC. Composite `(owner_id, entity_id)` foreign keys reject cross-tenant references in PostgreSQL, in addition to owner-scoped application queries. JSONB is limited to profile preferences, checklists/tags, historical habit schedules, routine/session snapshots, audit/idempotency/integration payloads.

All owner mutations lock the owner row, serializing a single user's commands while allowing different users to progress independently. Version comparisons reject stale edits; unique constraints protect invoice cycles, recurrence occurrences, habit check-ins, and a partial unique index protects the single active workout. Recurrence scheduled-date identity is protected by an immutability trigger independently of editable ledger dates. Creation generates the initial recurrence horizon atomically; future rule reconciliation preserves posted history. Sensitive commands persist request fingerprints and results in the same transaction as their effects. Ledger history and audit reasons survive reversals and closed-invoice refunds.

The seed recreates independent relative-date example records for each demo visitor. Expiry is enforced at authentication and expired tenants are removed on demo creation or by the cleanup job. A persisted monotonic demo row-write budget covers every domain/audit/idempotency/integration insert or update through the session flush boundary. Atomic reservations roll back with failed commands. Only explicit scoped reset replenishes the budget. Database transaction dependencies finish before sending successful responses.

## Jobs

```sh
uv run python -m app.jobs cleanup-demo
uv run python -m app.jobs extend-recurrences --through 2026-12-31
uv run python -m app.jobs telegram-worker
```

Run through an external scheduler. Core jobs do not require Redis or a paid provider. Live Telegram needs all of `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_PROVIDER_URL`, and `TELEGRAM_PROVIDER_KEY`; see the provider protocol in `app/integrations.py` and the explicit M10 limitations in `API.md`.

## Verification

Tests require an already migrated **dedicated** PostgreSQL database. They create and delete their own users; demo-expiry tests invoke expiry cleanup. Never point tests at personal or deployment data.

```sh
APP_MODE=demo DATABASE_URL=postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test uv run alembic upgrade head
APP_MODE=demo DATABASE_URL=postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test uv run pytest -q
uv run ruff check app tests migrations
uv run mypy app
APP_MODE=demo DATABASE_URL=postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test uv run alembic check
```

`test_domain.py` verifies money/calendar/history boundaries. API tests use real PostgreSQL and include actual concurrent requests, database foreign-key rejection, reversals/reporting, invoice credit carry, timezone boundaries, durable integration deduplication and scoped reset. Identity tests verify real RSA signatures, issuer/audience/expiry, discovery metadata, personal-mode rejection of demo credentials and expiry cleanup; they substitute offline JWKS/discovery retrieval, not token verification.

Review correction migration `4b90d2a724f1` adds recurrence scheduling fields, immutable original scheduled dates, effective-dated habit targets and persisted demo write counters. It refuses conflicting legacy recurrence identities rather than silently deleting financial history. Purchase PATCH atomically regenerates open unpaid installment plans while preserving purchase identity and a complete audit snapshot.
