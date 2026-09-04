# Prepared demo template implementation plan

User approved: ready demo base copied quickly into separate temporary visitor data; 24h expiry; same URL/database. No shared editable account.

Architecture: versioned bundled snapshot of validated fictitious data, exported offline using the existing seed inside a rolled-back transaction. Each visitor gets new IDs and owner, current relative dates, freshly calculated invoice calendar, then ORM batch writes per dependent table. Existing quota event hooks, transactional creation, max-session lock, auth and expiry continue. No migrations, paid services, extra jobs or public template credentials.

- [x] Export a baseline snapshot and implement deterministic in-memory rebasing of IDs, dates and invoices; test month ends/leap years and invariant totals.
- [x] Replace request-time seed generation with batched cloning. Assert bounded SQL round trips, isolation, reset, quota and expiry in database tests. Batch expired-user cleanup if necessary to avoid per-owner loops blocking entry.
- [x] Run backend checks/full suite, Docker; review diff for owner IDs, dates, quotas and atomicity. Document source regeneration and behavior.
- [ ] Publish through Render, measure warm creation latency against 35.43s baseline, verify health and cleanup only synthetic test demos; refresh archive/receipt.

Verification before publication: 123 backend tests passed; Ruff and mypy passed; Docker image orbit:demo-template built. Local creation uses 51 SQL statements (previously 600), measured at 0.148s. Independent review approved, including calendar/reference checks over 1,462 dates.
