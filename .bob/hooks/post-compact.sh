#!/bin/sh
# PostCompact hook — appends one log line to .bob/compaction.log after
# context compaction finishes, recording the branch and newest snapshot.
# Reads the JSON payload from stdin. Always exits 0.

# consume stdin (payload not needed here)
cat > /dev/null

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr -d '\n') || BRANCH="unknown"
[ -z "$BRANCH" ] && BRANCH="unknown"

SNAPSHOT_DIR=".bob/snapshots"
NEWEST_SNAPSHOT=$(ls -1t "$SNAPSHOT_DIR"/*.md 2>/dev/null | head -1)
[ -z "$NEWEST_SNAPSHOT" ] && NEWEST_SNAPSHOT="(none)"

LOG_FILE=".bob/compaction.log"
mkdir -p "$(dirname "$LOG_FILE")"

printf '[%s] Compaction completed on %s. Snapshot: %s\n' \
    "$TIMESTAMP" "$BRANCH" "$NEWEST_SNAPSHOT" >> "$LOG_FILE"

exit 0
