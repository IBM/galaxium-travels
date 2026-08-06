#!/bin/sh
# PostToolUse hook — runs mypy after any file-writing tool touches a .py file.
#
# NOTE: PostToolUse hook stdout is not injected back into the agent's context,
# so mypy errors are currently invisible to the agent mid-task. This hook is
# useful for auditing (check the output manually or pipe to a log), but the
# agent cannot self-correct from it in the same turn.
#
# TODO: Switch to context injection once PostToolUse supports it — that would
# allow the agent to see and fix type errors immediately after each edit.
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.path // empty')

# Only act on Python files
case "$path" in
  *.py)
    cd booking_system_backend
    .venv/bin/mypy . --ignore-missing-imports --show-error-codes
    ;;
esac
