# One online installation, one PostgreSQL database

The root `render.yaml` defines one **orbit** Docker web service with `APP_MODE=combined`. Personal email/password sessions and expiring visitor demos share PostgreSQL, with owner-scoped queries and foreign keys. The same responsive SPA/API serves desktop and mobile on one origin; `/demo` is an optional public entry path on that origin.

Required accounts: GitHub, Render and Neon. Auth0 is optional. Follow [the Portuguese deployment guide](DEPLOY-PT-BR.md) for the complete sequence: publish the verified GHCR image, select one Neon database, migrate once, create the personal account through the operator CLI, and deploy one service with exact HTTPS origin and secure cookies.

Existing `personal` and `demo` modes remain supported. When upgrading separate deployments, use the existing personal database with `combined`; do not merge databases or delete either old database automatically. Demo tenants in that database are created on demand. Original specification documents preserve historical decisions; the approved [unified installation plan](../../docs/plans/2026-09-03-unified-installation.md) supersedes the earlier two-service recommendation.

The image placeholder intentionally cannot deploy until replaced with the exact digest emitted by a successful release. Render pulls that tested image without rebuilding. Apply migrations from the operator's machine using `scripts/migrate-remote.sh`, then use `scripts/account-remote.sh` to create/reset the personal password interactively. Automatic deployment remains disabled until migration coordination is in place.

Validate health, personal login/logout, mobile persistence and personal/demo isolation before recording a public URL. For updates, back up first, migrate once, and deploy the pinned release; application rollback uses a compatible prior image. Database restoration is a separate operation.

Free plans have quotas and can sleep; no always-on guarantee or anti-sleep pings are assumed. Provider limits should be checked in the actual account. No cloud resources are provisioned by this repository alone.

References: [Prebuilt image deployment](https://render.com/docs/deploying-an-image), [Free limits](https://render.com/docs/free), [Blueprint schema](https://render.com/docs/blueprint-spec), [Neon Python connection](https://neon.com/docs/guides/python).
