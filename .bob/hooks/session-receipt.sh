#!/bin/sh
# Stop — append a session receipt to the audit log.
#
# The Stop payload is only {event, session_id}, so the detail comes from what
# the PostToolUse hook accumulated during the session. Every Bob session in this
# repo leaves a record: who, when, which files, on which commit.
#
# Non-blocking by contract: exit 2 is ignored, the session has already ended.

input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
state="${root}/.bob/hooks/state"
log="${state}/audit.log"
mkdir -p "$state"

files="${state}/session-${sid}.files"
if [ -f "$files" ]; then
  count=$(sort -u "$files" | wc -l | tr -d ' ')
  list=$(sort -u "$files" | tr '\n' ' ')
else
  count=0
  list="(none)"
fi

{
  echo "---"
  echo "session:   ${sid}"
  echo "ended:     $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "branch:    $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "commit:    $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "files:     ${count}"
  echo "touched:   ${list}"
} >> "$log"

rm -f "$files"
exit 0
