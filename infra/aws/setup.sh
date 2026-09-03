#!/bin/bash
set -euo pipefail
dnf update -y
dnf install -y docker
systemctl enable --now docker
install -d -m 700 /opt/orbit
# No credentials in user-data/state. Install the release using the SSM runbook.
