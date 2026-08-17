#!/bin/sh
# PreToolUse (execute_command) — no commit while the backend suite is red.
#
# `matcher` only regexes the TOOL NAME, so this runs on every shell call and
# self-filters on the command. Keep the cheap exit first.
#
# Gates on the fast backend suite (72 tests, ~0.5s) and NOT on ./test.sh, which
# builds the whole stack in Docker. A multi-minute blocking hook is unusable
# interactively, and with timeout:0 a dead Docker daemon would hang the session
# forever with no output. Slow e2e belongs in CI.

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.input.command // .tool_input.command // empty')
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

# 95% of shell calls are not commits -- get out before doing any work.
case "$cmd" in *"git commit"*) ;; *) exit 0 ;; esac

root="$hook_root"
state="$hook_state"

pytest_bin="${root}/booking_system_backend/.venv/bin/pytest"
if [ ! -x "$pytest_bin" ]; then
  # Fail open: a missing venv is an environment problem, not a policy breach.
  echo "gate-commit: no venv at ${pytest_bin}, skipping gate" >&2
  exit 0
fi

out=$(cd "${root}/booking_system_backend" && "$pytest_bin" -q 2>&1)
if [ $? -eq 0 ]; then
  rm -f "${state}/.last-block"
  exit 0
fi

{
  echo "BLOCKED: commit refused because the backend test suite is failing."
  echo "Command: ${cmd}"
  echo
  echo "Fix the failing tests, then commit again. Full pytest output follows."
  echo "---"
  printf '%s\n' "$out"
} > "${state}/.last-block"

# Name the failing tests in the receipt, not just "suite red" -- the point of
# the audit log is that you can read what happened without rerunning anything.
failed=$(printf '%s\n' "$out" | grep -E '^(FAILED|ERROR) ' | sed 's/^[A-Z]* //' | cut -d' ' -f1 | tr '\n' ' ')
[ -z "$failed" ] && failed=$(printf '%s\n' "$out" | tail -1)

journal_add "$sid" "$(jq -nc \
  --arg t "$hook_ts" --argjson epoch "$hook_epoch" \
  --arg subject "$(trunc "$cmd" 68)" \
  --arg reason "backend suite red: $(trunc "$failed" 90)" \
  '{kind:"blocked", t:$t, epoch:$epoch, by:"gate-commit", reason:$reason, subject:$subject}')"

echo "Blocked: backend suite is red. See .bob/hooks/state/.last-block" >&2
exit 2
