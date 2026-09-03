#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 4 || ! -f "$2" || ( "$3" != create && "$3" != reset-password ) ]]; then
  echo 'Usage: account-remote.sh IMAGE PRIVATE_ENV_FILE create|reset-password EMAIL' >&2
  exit 2
fi
# The password is entered interactively, never placed in the image or shell arguments.
docker run --rm -it --env-file "$2" "$1" python -m app.accounts "$3" "$4"
