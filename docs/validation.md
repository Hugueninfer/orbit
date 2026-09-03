# Validation evidence

Recorded during development on 2026-09-03. This is actual local evidence, not a claim of a public production deployment.

| Check | Evidence / current outcome |
|---|---|
| Backend domain/integration | 28 tests passed on actual PostgreSQL18 (initial independent-review candidate 002cc18); further review fixes will be recorded below |
| Python lint/types | Ruff clean, mypy no issues in 20 source modules |
| Database migrations | Fresh upgrade / downgrade / upgrade and Alembic drift check passed in isolated test database |
| Frontend | TypeScript production build passed; 4 focused Vitest tests passed |
| End-to-end | 4 Playwright tests passed across Chromium desktop and mobile against Docker app, 20.7s; tasks/habits/money/workout persist after reload, all primary routes fit viewport |
| Docker | Node24 multi-stage build, Python3.14 runtime and PostgreSQL18; app/db healthy, separate migration service exits0 |
| Personal identity | Actual browser Authorization Code + S256 PKCE through local Keycloak26.3.3, return to authenticated personal dashboard; separate database and no demo banner |
| Backup | Custom-format pg_dump restored to new isolated DB; Alembic revision verified; temporary restore DB removed |
| Terraform | fmt, init (AWS6.62.0) and validate passed using Terraform1.13.1; never applied |
| Resource observation | After core E2E, demo app ~94MiB RAM, DB ~68MiB; image ~434MB uncompressed. One local idle sample, not load-test sizing |
| External hosting | No Render/Neon/Auth0 resources or public URLs provisioned; user currently has GitHub only |

Meaningful failures fixed during integration: API calendar queries must stop at today's local date instead of month end; missing Python module import path in production wrapper; generated response optional schedule fields normalized by the frontend. These were reproduced by real browser/container checks rather than hidden with mock responses.

Known tool/dependency noise: test transport Starlette/httpx/anyio deprecations and Playwright terminal color environment warnings. No assertion failures are accepted as a release pass. The final reviewer report and latest image checks remain the release gate.

The optional Telegram adapter is not a verified live integration; conversations, receipt actions and full provider operation remain incomplete as described in backend documentation. No paid AI or AWS execution was used.
