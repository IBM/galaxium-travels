#!/bin/sh
# PostToolUse (write tools) — type-check Python edits and stash the result.
#
# PostToolUse stdout is discarded by design, so printing mypy output here would
# be invisible to the agent. Instead this writes failures to a stash file that
# the UserPromptSubmit hook (inject-pending.sh) prints on the next turn, where
# stdout IS injected. Two hooks, one feedback loop: the agent sees its own type
# errors and fixes them without being asked.
#
# Also records touched files for the Stop-hook session receipt.

input=$(cat)
path=$(printf '%s' "$input" | jq -r '.input.path // .tool_input.path // empty')
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

[ -z "$path" ] && exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
state="${root}/.bob/hooks/state"
mkdir -p "$state"

# Audit trail: every file this session wrote to.
printf '%s\n' "$path" >> "${state}/session-${sid}.files"

case "$path" in
  *.py) ;;
  *) exit 0 ;;
esac

mypy_bin="${root}/booking_system_backend/.venv/bin/mypy"
[ -x "$mypy_bin" ] || exit 0

# This repo is not mypy-clean, so report only errors absent from the baseline.
# Line numbers are stripped before comparison -- an edit that shifts a line must
# not resurface a known error as if it were new. Regenerate the baseline with
# .bob/hooks/gen-mypy-baseline.sh after intentionally changing the type surface.
baseline="${root}/.bob/hooks/mypy-baseline.txt"
[ -f "$baseline" ] || baseline=/dev/null

new=$( (cd "${root}/booking_system_backend" && \
        "$mypy_bin" . --ignore-missing-imports --show-error-codes 2>&1) \
       | sed 's/:[0-9][0-9]*:/:/' \
       | grep ': error:' \
       | sort -u \
       | comm -23 - "$baseline" )

[ -z "$new" ] && exit 0

{
  echo "mypy found NEW type errors after the last edit to ${path}"
  echo "(pre-existing baseline errors are suppressed):"
  printf '%s\n' "$new"
} > "${state}/.pending-type-errors"

exit 0
