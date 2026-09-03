#!/usr/bin/env bash
set -euo pipefail
# Explicit environment selection prevents accidentally backing up demo instead of personal.
if [[ $# -ne 3 || ! -f "$2" ]]; then echo 'Usage: backup.sh COMPOSE_PROJECT ENV_FILE OUTPUT.dump' >&2; exit 2; fi
project="$1"; env_file="$2"; output="$3"
[[ ! -e "$output" ]] || { echo 'Output already exists; choose a new backup name.' >&2; exit 2; }
umask 077
temporary="$(mktemp "${output}.partial.XXXXXX")"
trap 'rm -f "$temporary"' EXIT
docker compose -f "$(dirname "$0")/../compose.yaml" -p "$project" --env-file "$env_file" exec -T db pg_dump -U orbit -d orbit --format=custom --no-owner > "$temporary"
# Hard-link publication is atomic and refuses concurrent overwrites.
ln "$temporary" "$output"
echo "Backup saved for project $project: $output"
