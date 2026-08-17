#!/bin/sh
# SessionStart — environment preflight.
#
# Stdout from SessionStart IS injected into the model's context, so everything
# echoed here is known to the agent before its first turn. The point is that Bob
# starts the session already aware of the environment footguns in AGENTS.md
# (Java 17/21 only, Colima must be running, buildx must be installed) instead of
# discovering them three minutes into a Docker build.
#
# Non-blocking by contract: exit 2 is ignored and the session always starts.

echo "=== Galaxium environment preflight ==="

echo "Branch:      $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Uncommitted: ${dirty} file(s)"

# The Java hold service uses Lombok, which does not support Java 22+.
java_raw=$(java -version 2>&1 | head -1)
java_major=$(printf '%s' "$java_raw" | sed -n 's/.*"\([0-9]*\).*/\1/p')
case "$java_major" in
  17|21) echo "Java:        ${java_major} (ok)" ;;
  "")    echo "Java:        not found -- WARNING: hold service cannot be built" ;;
  *)     echo "Java:        ${java_major} -- WARNING: Lombok needs 17 or 21; the hold service will NOT compile. Do not run mvn against booking_system_inventory_hold_service." ;;
esac

# e2e tests build the full stack in Docker; a dead daemon fails slowly.
if docker ps >/dev/null 2>&1; then
  echo "Docker:      running (ok)"
else
  echo "Docker:      not reachable -- WARNING: ./test.sh and any compose command will fail. Colima is likely not started."
fi

if docker buildx version >/dev/null 2>&1; then
  echo "buildx:      present (ok)"
else
  echo "buildx:      missing -- WARNING: compose --build falls back to the legacy builder and fails on macOS with a keychain error (-128)."
fi

echo "=== end preflight ==="
exit 0
