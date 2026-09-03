# Architecture and invariant boundaries

A single FastAPI application owns the transactional business rules. React consumes REST resources and generated OpenAPI response types, with TanStack Query invalidation after successful writes. The same compiled SPA and API share one origin in the Docker runtime. PostgreSQL remains the source of truth.

## Backend modules

- `identity`: profile, owner lookup, optional OIDC verification, expiring isolated demo sessions and guarded reset.
- `accounts`: default personal email/password login, scrypt hashes, revocable cookie sessions, PostgreSQL login limits, origin/header CSRF checks, operator-only provisioning and recovery.
- `tasks`: lists, ordering and optimistic versions; checklist/tags carried in the task aggregate.
- `habits` / `domain`: local-date calendars, historical schedule interpretation, daily/weekly streaks.
- `finance` / `recurrences` / `resources`: money, accounts, ledger movements, transfers, recurrence generation, purchases, cycles, invoice settlement and credit carry-forward.
- `workouts`: routine snapshots, set records, one active session, audited corrections and derived performance.
- `dashboard`: read-only composition of owner-scoped domain data.
- `integrations`: optional Telegram durable capture/provider/outbox boundaries; external live workflow remains gated.

Typed SQLAlchemy tables store financial money/date fields as relational columns. Composite owner/ID references and database constraints back up application-level ownership validation. JSON is reserved for nested checklist, schedule and session/routine snapshots and audit details. The internal store adapter normalizes common ID/version/owner operations while each module owns its business commands.

## Critical invariants

- Every domain operation starts from authenticated owner scope. Unknown and foreign IDs both return 404.
- Sensitive commands accept an idempotency key: replay the same request, reject key reuse with a different body. User row locks serialize conflicting writes; version checks return 409 rather than silently overwriting newer state.
- Amounts are positive integer minor units. Installments have exact sum and differ by at most one cent; count cannot exceed cents.
- Closing dates include purchases on the close day. Missing calendar days clamp to month end; payment due dates are strictly later.
- Cash and accrual reporting exclude inappropriate invoice-payment double counting and internal transfers.
- Habit history is interpreted against the schedule and quantity target valid on that date; today's incomplete target does not break the current streak before the day ends.
- Recurrence occurrences retain an immutable scheduled date. Generation occupies cycles using that identity; future-rule reconciliation is separate from due-date editing. Posted and retained obligations cannot release their cycle through rescheduling.
- Demo writes have a persisted per-tenant budget covering business records, audit, idempotency, inbox and outbox; expiry and reset remain owner-scoped.
- Workout sessions copy routines. Later routine edits do not rewrite old sessions; post-completion set corrections are audited and derived metrics recalculated.

## Product boundaries

The app intentionally has no banking connection, generic AI assistant, native mobile app, offline synchronization, team collaboration, wearable integration or paid cloud requirement. Buttons copied from visual prototypes for those features have not been presented as working integrations.

The backend supports Python >=3.12 for local tooling, while the production artifact and CI use Python 3.14. PostgreSQL 18 and Node 24 are the target container versions. Exact dependency resolutions are in `uv.lock` and `package-lock.json`.
