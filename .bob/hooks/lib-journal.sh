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

# use_supported_java -> exports JAVA_HOME for a JDK Lombok supports (17/21).
# Tries the current java, then sdkman candidates. Returns 1 if none is found,
# so callers can skip Java checks instead of reporting a bogus compile failure.
use_supported_java() {
  case "$(java -version 2>&1 | head -1 | sed -n 's/[^"]*"\([0-9]*\).*/\1/p')" in
    17|21) return 0 ;;
  esac
  for jdk in "$HOME"/.sdkman/candidates/java/21* "$HOME"/.sdkman/candidates/java/17*; do
    if [ -x "${jdk}/bin/java" ]; then
      export JAVA_HOME="$jdk" PATH="${jdk}/bin:$PATH"
      return 0
    fi
  done
  return 1
}

# hook_fired <session_id> <hook-name> <outcome>
# Lets the receipt list which hooks ran and what each one decided, including
# the quiet outcomes ("not a commit", "nothing pending") that leave no other trace.
hook_fired() {
  journal_add "$1" "$(jq -nc --arg t "$hook_ts" --argjson epoch "$hook_epoch" \
    --arg hook "$2" --arg outcome "$3" \
    '{kind:"hook", t:$t, epoch:$epoch, hook:$hook, outcome:$outcome}')"
}

# trunc <text> <max-chars>
# Collapse to a single line and cut, so one pasted stack trace cannot blow out
# the receipt. Marks the cut with an ellipsis so nothing looks silently complete.
trunc() {
  printf '%s' "$1" | tr '\n\t' '  ' | awk -v n="$2" '{
    if (length($0) > n) printf "%s...", substr($0, 1, n); else printf "%s", $0
  }'
}
