# Two online installations from one repository

The root `render.yaml` defines **orbit-personal** and **orbit-demo**, both Docker web services on the Free plan. Supply independent Neon databases and credentials. Both URLs are online; personal use is not restricted to localhost. The same source and image contract serve desktop and mobile.

Account setup still required: GitHub (user already has it), Render, Neon and an OIDC provider such as Auth0. No accounts or cloud resources have been created by this project. The assigned URLs are only known after the provider creates the services.

1. Push the reviewed repository to your GitHub account.
2. Create two Neon projects (personal/demo); copy each connection string privately. SQLAlchemy uses `postgresql+psycopg://` and requires the provider's TLS query parameters (`sslmode=require&channel_binding=require`). Use direct connection for migration and pooled connection for the runtime if desired.
3. Create an Auth0 Single Page Application and an API identifier for the personal installation. Enable Authorization Code + PKCE. Set issuer URL with its trailing slash, public client ID, API audience and permitted callback `https://YOUR_PERSONAL_HOST/auth/callback`, logout URL and web origin. Disable public self-registration if the instance is personal-only. No client secret belongs in the SPA.
4. Build the approved release image. Save each environment in a private env file. Set `APP_MODE=demo` in demo and `APP_MODE=personal` with OIDC settings in personal. Apply `scripts/migrate-remote.sh IMAGE ENV_FILE` once for each database before the first web deploy.
5. Connect GitHub to Render and select the root Blueprint. Review that both services use Free and provide each service's independent environment values. Leave automatic deployment disabled until migrations are integrated into your release process. Set `ALLOWED_ORIGINS` to that service's HTTPS origin.
6. Deploy and validate `/api/v1/health`, login/callback, isolation, a persisted task after refresh, and the mobile layout. Record the actual URLs in the main README only after validation.
7. For updates, back up first, apply compatible migrations once, then deploy the pinned release. Restore the previous image for application rollback; destructive schema downgrades are not automated.

Free-plan constraints verified 2026-09-03: Render sleeps after 15 idle minutes, with about a minute to wake. A workspace shares **750 instance-hours/month across its free services**; two continuously running services would exceed this. No anti-sleep pings. Free services have no durable filesystem, no shell/one-off jobs and no paid pre-deploy hook. Migrations therefore run from the operator's machine (or a protected CI release job) before deploy. The provider's free Postgres expires after 30 days; use independent external persistent databases. Quotas and no-payment-method behavior must be checked in the actual account before relying on zero recurring cost.

References: [Free limits](https://render.com/docs/free), [deployment stages](https://render.com/docs/deploys), [Blueprint schema](https://render.com/docs/blueprint-spec), [Neon Python connection](https://neon.com/docs/guides/python).
