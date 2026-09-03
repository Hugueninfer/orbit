#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd backend && APP_MODE=demo .venv/bin/python -c 'import json; from app.main import app; print(json.dumps(app.openapi(), indent=2, sort_keys=True))') > backend/openapi.json
(cd web && npm run api:generate && npx prettier --write src/generated/api.ts)
