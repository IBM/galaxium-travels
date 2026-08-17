#!/bin/sh
# UserPromptSubmit — record the prompt in the session journal.
#
# IMPORTANT: this hook must stay silent. UserPromptSubmit stdout is injected
# into the model's context, so anything echoed here is fed back to Bob as if it
# were session information. Recording is a side effect; the receipt reads it
# later. All output goes to the journal, never to stdout.

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty')

[ -z "$prompt" ] && exit 0

entry=$(jq -nc \
  --arg t "$hook_ts" \
  --argjson epoch "$hook_epoch" \
  --arg text "$(trunc "$prompt" 220)" \
  --argjson chars "$(printf '%s' "$prompt" | wc -c | tr -d ' ')" \
  '{kind:"prompt", t:$t, epoch:$epoch, text:$text, chars:$chars}')

journal_add "$sid" "$entry"
exit 0
