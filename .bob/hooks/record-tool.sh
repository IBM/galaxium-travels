#!/bin/sh
# PostToolUse (all tools, no matcher) — record what the tool did and returned.
#
# This is the only hook that sees tool output, so it is the only place the
# receipt can learn what actually came back. PostToolUse stdout is discarded,
# which is fine: nothing here is meant for the model.
#
# Runs on EVERY tool call, so it has to stay cheap -- two jq passes and an
# append, no subprocess spawning per field.

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
sid=$(printf '%s'  "$input" | jq -r '.session_id // "unknown"')
tool=$(printf '%s' "$input" | jq -r '.tool // .tool_name // "unknown"')

# Different tools carry their subject in different fields: shell calls have a
# command, file tools have a path. Fall back to the whole input so an unknown
# tool still leaves a legible trace rather than a blank row.
subject=$(printf '%s' "$input" | jq -r '
  .input.command // .tool_input.command //
  .input.path    // .tool_input.path    //
  ((.input // .tool_input // {}) | tostring)')

path=$(printf '%s' "$input" | jq -r '.input.path // .tool_input.path // empty')
output=$(printf '%s' "$input" | jq -r '.output // .tool_response // ""')

lines=$(printf '%s' "$output" | grep -c '' 2>/dev/null || echo 0)
bytes=$(printf '%s' "$output" | wc -c | tr -d ' ')

# The write tools are the ones that change the repo -- flag them so the receipt
# can separate "looked at things" from "changed things".
case "$tool" in
  write_file|apply_diff|search_and_replace|insert_content) is_write=true ;;
  *) is_write=false ;;
esac

# Tool errors are reported in the output text rather than an exit status, so
# this is a heuristic. It is good enough to colour a receipt, not to gate on.
#
# Scope matters: a substring search for "error" anywhere in the output is wrong
# for file reads, because reading services/booking.py -- which imports
# ErrorResponse -- would flag a perfectly successful read. So the broad scan is
# limited to shell output, and everything else only matches a leading marker.
case "$tool" in
  execute_command)
    # "Cannot connect"/"refused" matter here because a stopped Colima is this
    # repo's most common failure and it says neither "error" nor "failed".
    case "$output" in
      *[Ee]rror*|*[Ff]ailed*|*Traceback*|*"Cannot connect"*|*"cannot connect"*|\
      *refused*|*"No such"*|*"Permission denied"*) ok=false ;;
      *) ok=true ;;
    esac ;;
  *)
    case "$output" in
      [Ee]rror*|Failed*|"No such"*|"Permission denied"*|"File not found"*) ok=false ;;
      *) ok=true ;;
    esac ;;
esac

entry=$(jq -nc \
  --arg t "$hook_ts" \
  --argjson epoch "$hook_epoch" \
  --arg tool "$tool" \
  --arg subject "$(trunc "$subject" 68)" \
  --arg path "$path" \
  --arg preview "$(trunc "$output" 100)" \
  --argjson lines "${lines:-0}" \
  --argjson bytes "${bytes:-0}" \
  --argjson write "$is_write" \
  --argjson ok "$ok" \
  '{kind:"tool", t:$t, epoch:$epoch, tool:$tool, subject:$subject,
    path:$path, preview:$preview, lines:$lines, bytes:$bytes,
    write:$write, ok:$ok}')

journal_add "$sid" "$entry"
exit 0
