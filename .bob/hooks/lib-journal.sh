#!/bin/sh
# Shared helpers for the session journal.
#
# The Stop payload is only {event, session_id} -- it carries no history at all.
# So anything the receipt wants to show has to be recorded as it happens, by the
# hooks that DO see it: UserPromptSubmit sees prompts, PostToolUse sees tool
# calls and their output, PreToolUse sees blocks. Each appends one JSON object
# per line to state/session-<id>.jsonl, and Stop renders the whole thing.
#
# Source this, do not execute it:  . "$(dirname "$0")/lib-journal.sh"

hook_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
hook_state="${hook_root}/.bob/hooks/state"
hook_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
hook_epoch=$(date +%s)

mkdir -p "$hook_state"

# journal_for <session_id> -> path to that session's journal
journal_for() {
  echo "${hook_state}/session-${1:-unknown}.jsonl"
}

# journal_add <session_id> <compact-json-object>
# Appending a line at a time keeps this safe against a session that never
# reaches Stop -- the journal is still on disk and still readable.
journal_add() {
  printf '%s\n' "$2" >> "$(journal_for "$1")"
}

# trunc <text> <max-chars>
# Collapse to a single line and cut, so one pasted stack trace cannot blow out
# the receipt. Marks the cut with an ellipsis so nothing looks silently complete.
trunc() {
  printf '%s' "$1" | tr '\n\t' '  ' | awk -v n="$2" '{
    if (length($0) > n) printf "%s...", substr($0, 1, n); else printf "%s", $0
  }'
}
