# Task 3 independent operations/security review

Reviewed 2026-09-03 against commit `735a6ea5f47f9e634cb1dcd1231f7651bfaa2541` plus the current CI/release edits (frozen runtime dependency audit and reusable CI release gate). Scope: Docker, Compose, production adapter, operational scripts, CI/release, Render/AWS artifacts, and their documentation. Backend domain implementation and frontend implementation were excluded.

## Verdict

**Approved on scoped re-review: all 3 Important findings and the Minor finding below are resolved in the current working tree. No open Critical or Important finding remains in this reviewed scope.** The local non-root Docker core, separate project volumes, local-only identity binding, no-secret examples, and honest distinction between prepared and actually deployed cloud resources are sound. External account creation and AWS execution are appropriately not claimed as completed.

## Scoped re-review, 2026-09-03

- **R1 resolved:** `scripts/backup.sh:4-10` now requires explicit Compose project, env file and destination; `scripts/restore-check.sh:4-10` carries the same explicit context through creation, restore, verification and its cleanup trap. `docs/runbook.md:31-38` uses `orbit-personal .env.personal`, explains the separate demo arguments, and supplies a managed-PostgreSQL backup path using the new `scripts/backup-remote.sh`. The latter receives libpq credentials via a private Docker env file, and the guide specifies verified TLS. Restore uses `--exit-on-error`, checks schema revision/users, and can only drop the newly created temporary database. The implementer reports an actual personal backup/restore with one restored user; the reviewer did not repeat the database exercise.
- **M1 resolved:** both backup scripts create a same-directory temporary file under umask 077, refuse existing destinations, publish by an atomic non-overwriting hard link after successful dump, and remove temporary output in an EXIT trap. Existing dumps are never redirected/truncated; even a concurrent creator makes publication fail rather than overwriting the other file. Mode 600 was additionally verified by the implementer.
- **R2 resolved:** `.github/workflows/ci.yml:61-69` saves the image that passed Compose/E2E as a release artifact. `.github/workflows/release.yml:15-33` downloads/loads that artifact, tags and pushes it without rebuilding, then prints its registry digest. `render.yaml:8-12,24-28` now deploys an image reference instead of building source. The deliberately unusable placeholder and `infra/render/README.md:10-13` require both deployments and the migration command to use the verified digest after publication. Registry visibility/credentials are documented. No public release/registry/Render execution occurred during review; this approves the prepared artifact chain, not a claim that it has already run in GitHub or cloud.
- **R3 resolved:** `infra/serve.py:13-19` explicitly enables INFO, installs a message-only stream handler, and disables propagation. Error events now carry request ID/exception type without serializing exception messages or SQL parameters. A focused reviewer check loaded the updated adapter after actual Uvicorn logging configuration and invoked its middleware with an in-memory response: exactly one JSON `http_request` event was emitted, status was 200, and its request ID matched the response header. The stream is stderr by default, which is captured by Docker/Render logging and satisfies the operational requirement.
- Reviewer additionally ran `bash -n` on all three backup/restore scripts; it passed. No broad test suite, cloud operation, backup/restore rerun, or code change was performed. Only this review report was updated.

## Original Important findings — closed by the re-review above

### R1 — The documented backup silently targets the demo database instead of the personal database

- Location: `scripts/backup.sh:6`; `scripts/restore-check.sh:6-9`; `docs/runbook.md:17,31-36`.
- The documented personal instance is launched with `-p orbit-personal --env-file .env.personal`, but both backup scripts call bare `docker compose`, accept only a dump path, and the documented invocations do not set a project/environment. Root Compose explicitly defaults to project `orbit` (`compose.yaml:1`). After following the quickstart and personal setup, a successful “personal” backup therefore captures the running demo database. Restore-check also succeeds against the demo service, giving false confidence while personal records remain unprotected. With only personal running, the documented backup simply fails to find the default service.
- Focused read-only evidence: `docker compose ls --format json` showed both projects running; `docker compose config --format json` resolved database volume `orbit_postgres_data`, while `docker compose -p orbit-personal --env-file .env.personal config --format json` resolved `orbit-personal_postgres_data`. Script line 6 has no way to select the latter through its documented arguments. No backup or restore was rerun.
- Required correction: make the backup/restore target explicit, preserve it throughout the restore cleanup trap, and document separate personal/demo commands. Supporting explicitly set `COMPOSE_PROJECT_NAME`/`COMPOSE_ENV_FILES` with correct documented invocations is another possible implementation. The online path additionally needs an explicit external-PostgreSQL backup/restore command because these scripts only reach a local Compose `db` service. Verify selection using a harmless query/fixture in an isolated test, rather than writing into personal data.

### R2 — Release and Render rebuild images after the tested container, breaking artifact continuity

- Location: `.github/workflows/release.yml:27-34`; `.github/workflows/ci.yml:54-60`; `render.yaml:6-10,22-26`.
- Reusing CI is a meaningful improvement, but CI builds and exercises `orbit:local` on its own runner. The publication job then performs a fresh Docker build on another runner, with no E2E verification of that output and no transfer of the image tested by CI. Docker base references are mutable (`Dockerfile:2,9-10`). The Render blueprint subsequently uses `runtime: docker` and the repository Dockerfile, causing yet another independent source build rather than deploying the tested GHCR digest. Meanwhile the runbooks explicitly direct migration with an image and deployment/rollback of a pinned release (`docs/runbook.md:25-27`, `infra/render/README.md:10-13`). Thus the published and deployed artifacts are not demonstrably the verified artifact, and the supplied blueprint does not implement those pinned-image instructions.
- Evidence: static dependency trace through the workflow shows `verify` only gates job completion; there is no image artifact/output consumed by `container`, and `build-push-action` runs a new build. The blueprint has no image digest/reference. This contradicts the accepted release requirement to deploy the same artifact and avoid divergent rebuilding (`docs/deployment-requirements.md`, “Release reproduzível”). No GitHub or Render execution was initiated.
- Required correction: build one candidate, test that candidate with PostgreSQL/E2E, and publish that exact image; then configure/document both online services to deploy its immutable digest, or provide an equally concrete release mechanism proving digest equality. Migrations must use the same release artifact. Preserve the separation of databases and do not enable automatic database migrations as a shortcut.

### R3 — The structured request logger is disabled in the actual production logging configuration

- Location: `infra/serve.py:13,40-44`; `Dockerfile:27`; `docs/runbook.md:57-58`.
- The custom `orbit.requests` logger emits at INFO but has no configured handler or INFO level anywhere in the application. Uvicorn configures its own loggers, leaving this logger at the root WARNING level. The Docker command also sets `--no-access-log`. Consequently normal production requests have neither the promised structured event nor the usual access log, and the response request ID cannot be correlated to a successful request event as documented.
- Focused check inside the already running app container, using the same installed Uvicorn logging configuration:

  ```python
  import logging
  from uvicorn.config import Config
  Config("serve:app", access_log=False).configure_logging()
  logger = logging.getLogger("orbit.requests")
  print(logger.getEffectiveLevel(), logger.isEnabledFor(logging.INFO), len(logger.handlers))
  # 30 False 0
  ```

  Repository search found no other `logging`, `basicConfig` or `dictConfig` setup in `backend/app` or `infra`.
- Required correction: explicitly configure the request logger/handler for JSON INFO output to stdout, avoiding duplicate propagation and keeping tokens/bodies out of events. Verify one health/API request yields the expected structured event and matching response request ID.

## Original Minor finding — closed by the re-review above

### M1 — Backup output permissions and replacement are weaker than the runbook promises

- Location: `scripts/backup.sh:5-6`; `docs/runbook.md:36`.
- `umask 077` secures a newly created file but does not change an existing destination's permissions. Shell redirection also truncates an existing good backup before `docker compose`/`pg_dump` can fail. A typo in the selected project or database outage can therefore replace the only existing dump with an empty/partial file; a preexisting mode-644 file remains readable despite the stated mode-600 guarantee.
- Suggested correction: write to a newly created mode-600 temporary file in the destination directory, remove it on failure, and atomically rename only after a successful dump (or refuse to overwrite an existing destination). This also makes a later explicit-target implementation safer.

## Review limits and accepted conditions

- Read the Task 3 plan, product rulings, deployment requirements, README/runbook/validation, all scoped production/CI/cloud artifacts and Keycloak realm config.
- Performed only scoped read-only Compose inventory/configuration and an isolated Python logging-configuration check in the existing container. No broad test reruns, account changes, cloud calls, migration, restore, Terraform apply, code edits or commits were performed. This report is the sole file written.
- Previously recorded actual Docker, personal OIDC, backup/restore and Terraform validation evidence was considered; those checks do not eliminate the target-selection or image-provenance defects above.
- Render account quotas/costs and AWS live behavior were not independently revalidated; they are documented as account-dependent, and AWS remains an optional, unapplied lab. These are not new blockers in this review.
- No demand to provision cloud accounts or spend money is implied by any finding.
