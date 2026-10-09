#!/bin/sh
# PreCompact hook — writes a snapshot of the current workspace state to
# .bob/snapshots/<UTC-timestamp>.md before context compaction runs.
# Reads the JSON payload from stdin. Always exits 0.

PAYLOAD=$(cat)

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr -d '\n') || BRANCH="unknown"
[ -z "$BRANCH" ] && BRANCH="unknown"

SNAPSHOT_DIR=".bob/snapshots"
mkdir -p "$SNAPSHOT_DIR"

SNAPSHOT_FILE="$SNAPSHOT_DIR/${TIMESTAMP}.md"

GIT_STATUS=$(git status --short 2>/dev/null)
GIT_DIFF_STAT=$(git diff --stat 2>/dev/null)

cat > "$SNAPSHOT_FILE" <<EOF
# Pre-Compaction Snapshot

**Timestamp:** ${TIMESTAMP}
**Branch:** ${BRANCH}

## Git Status

\`\`\`
${GIT_STATUS}
\`\`\`

## Git Diff Stat

\`\`\`
${GIT_DIFF_STAT}
\`\`\`

## Raw Payload

\`\`\`json
${PAYLOAD}
\`\`\`
EOF

exit 0
