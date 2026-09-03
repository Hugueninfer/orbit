#!/usr/bin/env bash
set -euo pipefail
# ENV_FILE supplies libpq PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE/PGSSLMODE.
if [[ $# -ne 2 || ! -f "$1" ]]; then echo 'Usage: backup-remote.sh PRIVATE_PG_ENV_FILE OUTPUT.dump' >&2; exit 2; fi
[[ ! -e "$2" ]] || { echo 'Output already exists; choose a new backup name.' >&2; exit 2; }
umask 077
temporary="$(mktemp "${2}.partial.XXXXXX")"
trap 'rm -f "$temporary"' EXIT
docker run --rm --env-file "$1" postgres:18-bookworm pg_dump --format=custom --no-owner > "$temporary"
ln "$temporary" "$2"
echo "Remote backup saved: $2"
