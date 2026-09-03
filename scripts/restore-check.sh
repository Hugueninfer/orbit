#!/usr/bin/env bash
set -euo pipefail
# Restores ONLY into a new isolated database, never over the live database.
if [[ $# -ne 1 || ! -f "$1" ]]; then echo 'Usage: restore-check.sh EXISTING.dump' >&2; exit 2; fi
restore_db="orbit_restore_$(date +%s)"
docker compose exec -T db createdb -U orbit "$restore_db"
trap 'docker compose exec -T db dropdb -U orbit "$restore_db"' EXIT
docker compose exec -T db pg_restore -U orbit -d "$restore_db" --no-owner < "$1"
docker compose exec -T db psql -U orbit -d "$restore_db" -c 'SELECT version_num FROM alembic_version;'
echo 'Isolated restore succeeded; verification database will be removed.'
