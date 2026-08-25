#!/bin/sh
# UserPromptSubmit — deliver anything the PostToolUse hooks stashed.
#
# This is the half of the loop that can actually talk to the model:
# UserPromptSubmit stdout is injected into context alongside the prompt.
# Print the stash, then clear it so the same errors are not replayed forever.
#
# Exit 2 would block the prompt entirely. We never do that -- this hook informs,
# it does not gate.

#cat >/dev/null   # drain stdin; we do not need the prompt itself

#root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
#state="${root}/.bob/hooks/state"

#if [ -f "${state}/.pending-type-errors" ]; then
#  echo "=== automated type check (from the previous turn) ==="
#  cat "${state}/.pending-type-errors"
#  echo "=== fix these before continuing ==="
#  rm -f "${state}/.pending-type-errors"
#fi

#if [ -f "${state}/.last-block" ]; then
#  echo "=== a tool call was blocked by a policy hook ==="
#  cat "${state}/.last-block"
#  echo "=== end block report ==="
#  rm -f "${state}/.last-block"
#fi

exit 0
