# Orbit API

FastAPI / SQLAlchemy 2 / psycopg 3 / PostgreSQL 18. Python 3.14 is the container target; Python >=3.12 supports local tooling. Dependencies are resolved in `uv.lock`.

```sh
cd backend
uv sync --frozen
export APP_MODE=demo
export DATABASE_URL=postgresql+psycopg://orbit:password@localhost:5432/orbit_demo
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Production startup does not create or mutate database schema. Apply Alembic as a separate release step. `GET /health/live` checks the process; `/api/v1/health` checks PostgreSQL. Interactive API docs: `/api/docs`; typed contract: `/api/v1/openapi.json`. The root runtime wraps the API to serve the web artifact.

Personal mode requires `OIDC_AUTHORITY`, `OIDC_CLIENT_ID`, and `OIDC_AUDIENCE` configured for signed access tokens. Standard discovery validates the issuer; optional `OIDC_JWKS_URL` supports trusted internal routing. Do not use a personal database for demo: deploy the same artifact against separate databases with explicit `APP_MODE`.

`API.md` describes all commands, response fields, accounting policies, and the optional Telegram milestone's limits.

## Persistence and concurrency

24 relational tables plus Alembic history. Core dates are SQL DATE, technical timestamps TIMESTAMPTZ, money BIGINT, weight NUMERIC. Composite `(owner_id, entity_id)` foreign keys reject cross-tenant references in PostgreSQL, in addition to owner-scoped application queries. JSONB is limited to profile preferences, checklists/tags, historical habit schedules, routine/session snapshots, audit/idempotency/integration payloads.

All owner mutations lock the owner row, serializing a single user's commands while allowing different users to progress independently. Version comparisons reject stale edits; unique constraints protect invoice cycles, recurrence occurrences, habit check-ins, and a partial unique index protects the single active workout. Sensitive commands persist request fingerprints and results in the same transaction as their effects. Ledger history and audit reasons survive reversals and closed-invoice refunds.

The seed recreates independent relative-date example records for each demo visitor. Expiry is enforced at authentication and expired tenants are removed on demo creation or by the cleanup job. Demo cap counters are cached only for the current database transaction.

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
