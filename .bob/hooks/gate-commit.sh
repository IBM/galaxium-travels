#!/bin/sh
# PreToolUse (execute_command) — no commit while a unit suite is red.
#
# `matcher` only regexes the TOOL NAME, so this runs on every shell call and
# self-filters on the command. Keep the cheap exit first.
#
# Gates on the backend pytest suite (~0.5s) and the Java unit suite (~9s), the
# checks too slow for check-edit.sh to run after every edit. NOT on ./test.sh,
# which builds the whole stack in Docker: a multi-minute blocking hook is
# unusable interactively, and slow e2e belongs in CI / the verify skill.

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.input.command // .tool_input.command // empty')
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

# 95% of shell calls are not commits -- get out before doing any work. Match
# only an actual `git commit` invocation, not a commit mentioned in a grep/echo.
if ! printf '%s' "$cmd" | grep -Eq '(^|[;&|][[:space:]]*)git[[:space:]]+commit'; then
  hook_fired "$sid" gate-commit "not a commit"
  exit 0
fi

root="$hook_root"
state="$hook_state"
report=""
failed=""

# Fail open on missing tooling: an environment problem is not a policy breach.
pytest_bin="${root}/booking_system_backend/.venv/bin/pytest"
if [ -x "$pytest_bin" ]; then
  echo "gate-commit: running backend test suite…" >&2
  out=$(cd "${root}/booking_system_backend" && "$pytest_bin" -q 2>&1)
  if [ $? -eq 0 ]; then
    echo "gate-commit: ✓ backend $(printf '%s\n' "$out" | tail -1)" >&2
  else
    report="${report}=== backend (pytest) ===
${out}
"
    failed="${failed}$(printf '%s\n' "$out" | grep -E '^(FAILED|ERROR) ' | sed 's/^[A-Z]* //' | cut -d' ' -f1 | tr '\n' ' ')"
  fi
else
  echo "gate-commit: no venv at ${pytest_bin}, skipping backend suite" >&2
fi

if use_supported_java && command -v mvn >/dev/null 2>&1; then
  echo "gate-commit: running Java hold-service unit tests…" >&2
  out=$(cd "${root}/booking_system_inventory_hold_service" && mvn -q -o test 2>&1)
  if [ $? -eq 0 ]; then
    echo "gate-commit: ✓ hold service tests passed" >&2
  else
    report="${report}=== hold service (mvn test) ===
$(printf '%s\n' "$out" | grep -E '^\[ERROR\] (  |Tests run:)' | sed 's/^\[ERROR\] *//' | head -40)
"
    failed="${failed}$(printf '%s\n' "$out" | sed -n 's/^\[ERROR\] *\([A-Za-z0-9_.]*\.[A-Za-z0-9_]*\) -- .*/\1/p' | sort -u | tr '\n' ' ')"
  fi
else
  echo "gate-commit: no Java 17/21 or mvn, skipping hold service suite" >&2
fi

if [ -z "$report" ]; then
  echo "gate-commit: commit allowed" >&2
  hook_fired "$sid" gate-commit "suites green, commit allowed"
  rm -f "${state}/.last-block"
  exit 0
fi

{
  echo "BLOCKED: commit refused because a unit test suite is failing."
  echo "Command: ${cmd}"
  echo
  echo "Fix the failing tests, then commit again. Output follows."
  echo "---"
  printf '%s' "$report"
} > "${state}/.last-block"

# Name the failing tests in the receipt, not just "suite red" -- the point of
# the audit log is that you can read what happened without rerunning anything.
[ -z "$failed" ] && failed="see .last-block"

journal_add "$sid" "$(jq -nc \
  --arg t "$hook_ts" --argjson epoch "$hook_epoch" \
  --arg subject "$(trunc "$cmd" 68)" \
  --arg reason "suite red: $(trunc "$failed" 90)" \
  '{kind:"blocked", t:$t, epoch:$epoch, by:"gate-commit", reason:$reason, subject:$subject}')"

cat "${state}/.last-block" >&2
echo "(Full report: .bob/hooks/state/.last-block)" >&2
exit 2
