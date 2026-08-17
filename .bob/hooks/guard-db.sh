#!/bin/sh
# PreToolUse (execute_command) — refuse to delete the committed database files.
#
# AGENTS.md: "holds.db and booking.db are committed artefacts -- do not delete.
# They seed local dev." That is a documented rule, which means it is a hope that
# the model reads and obeys it. This hook makes it a fact: the tool call does not
# run, whatever the model intended.
#
# Exit 2 blocks the tool. Bob reports it as blocked and the session continues.

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.input.command // .tool_input.command // empty')

[ -z "$cmd" ] && exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
state="${root}/.bob/hooks/state"
mkdir -p "$state"

blocked=""
case "$cmd" in
  *rm*.db*|*rm*booking.db*|*rm*holds.db*)
    blocked="a delete targeting a .db file" ;;
  *"git clean"*)
    blocked="git clean, which would remove the committed .db artefacts" ;;
esac

[ -z "$blocked" ] && exit 0

{
  echo "BLOCKED: ${blocked}"
  echo "Command: ${cmd}"
  echo
  echo "booking.db and holds.db are committed artefacts that seed local dev."
  echo "They are regenerated on startup via ddl-auto=update and SEED_DEMO_DATA=true."
  echo "If you need a clean database, restart the stack instead of deleting files."
} > "${state}/.last-block"

echo "Blocked: refuses to delete committed .db artefacts. See .bob/hooks/state/.last-block" >&2
exit 2
