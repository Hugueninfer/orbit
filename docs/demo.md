# Demo base and temporary visitor data

Visitors continue to get distinct accounts and tokens, with an expiry of 24 hours by default. There is no shared public account: edits, resets, exports and logout apply only to that visitor. Personal accounts and their data are unaffected.

The immutable fictitious dataset lives in `backend/app/fixtures/demo-base.json`. It contains 177 prepared domain/audit records; it has no password, access token, real account or personal data. It is shipped inside the Docker image (and Python package). Entering/resetting a demo rebases this snapshot in memory and inserts records in batches, rather than replaying hundreds of individual application operations.

`demo_template.py` creates new UUIDs for all records and nested workout references, shifts civil dates using the visitor's timezone, shifts timestamps relative to now, and recalculates card cycles with the normal calendar rules. Amounts remain integer BRL centavos. Insertion follows foreign-key table order and uses the ORM, preserving the quota hooks for every copied row. If any step fails, the transaction rolls back the account, token and copied records together.

Expired sessions cannot authenticate. On the next demo entry, expired accounts and data are removed in set-based statements with database cascades; active demos and personal accounts remain. The existing transaction lock retains the cap on concurrent demo accounts. Reset restores the base only inside the caller's account, with current dates and fresh IDs.

## Updating the prepared examples

1. Modify `build_demo_source` in `backend/app/seed.py` when examples should change. It is an offline source builder; `seed_demo` called by the API only clones the snapshot.
2. Start the **local test PostgreSQL** container and apply migrations.
3. From `backend`, run with the local test URL:

```sh
APP_MODE=demo DATABASE_URL=postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test .venv/bin/python -m app.export_demo_template
```

The exporter creates a temporary fictitious account in a transaction and always rolls it back; only the JSON file is saved. Review/commit the fixture with its source changes. Its reference date/time is fixed for reproducibility of relative-date examples; UUIDs are replaced at every copy.

4. Run the demo-template, finance, quota and identity tests, then build the Docker image. New snapshot shapes/calendar relationships must be covered by tests; invoice rebasing currently targets the example purchase and its installments.

No additional service, scheduled reset job, environment variable or database migration is required. The Render Free service may still take time to wake after inactivity; the prepared base removes the expensive record-by-record demo initialization after the service is available.
