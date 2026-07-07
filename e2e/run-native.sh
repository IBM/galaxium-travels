#!/usr/bin/env bash
# Run the e2e suite natively (no Docker).
#
# Starts the Python backend and Java hold service directly, waits for both to
# be healthy, runs the full suite, then tears everything down. Uses throwaway
# SQLite databases in a temp dir — nothing touches your dev booking.db / holds.db.
#
# The Java jar is built automatically on first run if not already present.
#
#   ./run-native.sh                 # full run (also callable as ./test.sh from root)
#   E2E_RUN_SLOW=1 ./run-native.sh  # also run the ~90s auto-expiry test
#   ./run-native.sh -k confirm      # extra args pass straight through to pytest
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
BACKEND_DIR="$ROOT/booking_system_backend"
JAVA_DIR="$ROOT/booking_system_inventory_hold_service"
JAR="$JAVA_DIR/target/inventory-hold-service-1.0.0.war"

BACKEND_PORT=8001
JAVA_PORT=8080

TMPDIR_E2E="$(mktemp -d -t galaxium-e2e)"
BACKEND_LOG="$TMPDIR_E2E/backend.log"
JAVA_LOG="$TMPDIR_E2E/java.log"
BACKEND_PID=""
JAVA_PID=""

cleanup() {
  echo "[e2e] shutting down services..."
  [ -n "$JAVA_PID" ] && kill "$JAVA_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  # Belt-and-suspenders: free the ports if the PIDs already exited oddly.
  lsof -ti :"$JAVA_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  lsof -ti :"$BACKEND_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  rm -rf "$TMPDIR_E2E"
}
trap cleanup EXIT

fail() { echo "[e2e] ERROR: $1"; [ -n "${2:-}" ] && tail -25 "$2"; exit 1; }

wait_for() {  # name url timeout
  local name="$1" url="$2" timeout="$3" deadline
  deadline=$(( $(date +%s) + timeout ))
  until curl -sf "$url" >/dev/null 2>&1; do
    [ "$(date +%s)" -ge "$deadline" ] && return 1
    sleep 1
  done
  echo "[e2e] $name is up"
}

# --- prerequisites --------------------------------------------------------
command -v java >/dev/null || fail "java not found on PATH"
[ -x "$BACKEND_DIR/.venv/bin/python" ] || fail "backend venv missing ($BACKEND_DIR/.venv) — create it and pip install -r requirements.txt"

if [ ! -f "$JAR" ]; then
  echo "[e2e] jar not found — building hold service (this takes ~1 min on first run)..."
  command -v mvn >/dev/null || fail "mvn not found on PATH — install Maven to auto-build the jar"
  ( cd "$JAVA_DIR" && mvn package -DskipTests -q ) || fail "Maven build failed — check Java version (requires 8-21; legacy Spring Boot 2.7 build)"
fi

# --- start backend (throwaway SQLite) ------------------------------------
echo "[e2e] starting Python backend on :$BACKEND_PORT ..."
( cd "$BACKEND_DIR" && \
  DATABASE_URL="sqlite:///$TMPDIR_E2E/booking.db" \
  SEED_DEMO_DATA=true \
  JAVA_SERVICE_URL="http://localhost:$JAVA_PORT" \
  .venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port "$BACKEND_PORT" \
  >"$BACKEND_LOG" 2>&1 ) &
BACKEND_PID=$!

# --- start Java hold service (short timers so expiry is testable) ---------
echo "[e2e] starting Java hold service on :$JAVA_PORT ..."
( PYTHON_BACKEND_URL="http://localhost:$BACKEND_PORT" \
  SPRING_DATASOURCE_URL="jdbc:sqlite:$TMPDIR_E2E/holds.db" \
  HOLD_DURATION_MINUTES=1 \
  HOLD_EXPIRATION_CHECK_INTERVAL_SECONDS=5 \
  java -jar "$JAR" --server.port="$JAVA_PORT" \
  >"$JAVA_LOG" 2>&1 ) &
JAVA_PID=$!

wait_for "backend" "http://localhost:$BACKEND_PORT/" 60 || fail "backend never became healthy" "$BACKEND_LOG"
wait_for "java-service" "http://localhost:$JAVA_PORT/api/v1/health" 90 || fail "java service never became healthy" "$JAVA_LOG"

# --- run the suite against the running services ---------------------------
if [ ! -d "$HERE/.venv" ]; then
  python3 -m venv "$HERE/.venv"
fi
# shellcheck disable=SC1091
source "$HERE/.venv/bin/activate"
pip install -q -r "$HERE/requirements.txt"

echo "[e2e] running suite..."
cd "$HERE"
E2E_BASE_URL="http://localhost:$BACKEND_PORT" pytest "$@"
