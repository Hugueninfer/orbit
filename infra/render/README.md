# Direct Docker deployment from GitHub

The default deployment builds the repository Dockerfile directly on Render. No GitHub release, GHCR package or successful GitHub Actions run is required to start a manual Render deployment. The root `render.yaml` defines one Docker Free service from `main`, with `APP_MODE=combined`, one Neon database and manual deploys.

Follow the [Portuguese guide](DEPLOY-PT-BR.md): prepare one Neon database, build the same source locally for migrations/operator account creation, then connect `Hugueninfer/orbit` as a Docker Web Service on Render. Alternatively import the Blueprint; do not create both.

Personal accounts are created only via CLI; visitor demos remain isolated by owner in the same database. Existing data is not merged or deleted. Public HTTPS requires secure cookies and the exact allowed origin.

CI and optional GHCR releases remain available independently. Automatic deploys are disabled to coordinate backups and migrations before a manual deploy. The new source-build path supersedes the previous verified-image placeholder instructions.

No public service or real personal account was created by this configuration change. Free plans have quotas and can sleep. See [Render Docker documentation](https://render.com/docs/docker).
