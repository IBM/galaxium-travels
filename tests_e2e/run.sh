#!/usr/bin/env bash
# Run the end-to-end suite in an isolated venv.
# By default it builds & starts the full stack, runs the tests, then tears it down.
#
#   ./run.sh                  # full run (manages docker compose)
#   E2E_RUN_SLOW=1 ./run.sh   # also run the ~90s auto-expiry test
#   E2E_BASE_URL=http://localhost:8001 ./run.sh   # run against an already-running backend
#   ./run.sh -k confirm       # any extra args are passed straight to pytest
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

exec pytest "$@"
