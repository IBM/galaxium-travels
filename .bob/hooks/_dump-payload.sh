#!/bin/sh
# Debug helper — dumps a raw hook payload so you can confirm the stdin field
# names before relying on them. Not part of the demo; wire it up temporarily,
# trigger one tool call, then read .bob/hooks/state/payload.json.
#
#   "PreToolUse": [{ "matcher": "^execute_command$",
#     "hooks": [{ "type": "command", "command": "sh .bob/hooks/_dump-payload.sh" }] }]
#
# The docs say the tool payload is {event, session_id, tool, input}. Some
# builds send {tool_name, tool_input} instead. Every hook here reads both, so
# this is a belt-and-braces check rather than a hard dependency.
set -e
dir="$(dirname "$0")/state"
mkdir -p "$dir"
cat > "$dir/payload.json"
exit 0
