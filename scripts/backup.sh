#!/usr/bin/env bash
set -euo pipefail
# Usage: ./scripts/backup.sh /secure/location/orbit.dump
if [[ $# -ne 1 ]]; then echo 'Usage: backup.sh OUTPUT.dump' >&2; exit 2; fi
umask 077
docker compose exec -T db pg_dump -U orbit -d orbit --format=custom --no-owner > "$1"
echo "Backup saved: $1"
