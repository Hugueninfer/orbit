#!/usr/bin/env bash
set -euo pipefail
# Restores ONLY into a new isolated database, never over the live database.
if [[ $# -ne 3 || ! -f "$2" || ! -f "$3" ]]; then echo 'Usage: restore-check.sh COMPOSE_PROJECT ENV_FILE EXISTING.dump' >&2; exit 2; fi
compose=(docker compose -f "$(dirname "$0")/../compose.yaml" -p "$1" --env-file "$2")
restore_db="orbit_restore_$(date +%s)_$$"
"${compose[@]}" exec -T db createdb -U orbit "$restore_db"
trap '"${compose[@]}" exec -T db dropdb -U orbit "$restore_db"' EXIT
"${compose[@]}" exec -T db pg_restore -U orbit -d "$restore_db" --no-owner --exit-on-error < "$3"
"${compose[@]}" exec -T db psql -U orbit -d "$restore_db" -v ON_ERROR_STOP=1 -c 'SELECT version_num FROM alembic_version; SELECT count(*) AS restored_users FROM users;'
echo 'Isolated restore succeeded; verification database will be removed.'
