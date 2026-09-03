#!/usr/bin/env bash
set -euo pipefail
# Configuration remains in a private env file, not CLI history or image layers.
if [[ $# -ne 2 || ! -f "$2" ]]; then echo 'Usage: migrate-remote.sh IMAGE PRIVATE_ENV_FILE' >&2; exit 2; fi
docker run --rm --env-file "$2" "$1" alembic upgrade head
