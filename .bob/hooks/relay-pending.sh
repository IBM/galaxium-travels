#!/bin/sh
# PreToolUse (all tools) — deliver check failures stashed by check-edit.sh.
#
# PostToolUse output never reaches the agent, and UserPromptSubmit only fires
# after the agent has already finished its turn. A PreToolUse block is the one
# channel that reports back mid-turn, so this hook blocks exactly ONE tool call
# per batch of failures, hands over the reason, and clears the stash. The agent
# sees what broke within one tool call of breaking it.
#
# The blocked call is collateral: retrying it goes through.

. "$(dirname "$0")/lib-journal.sh"

state="$hook_state"

input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

# Cheap exit first: this runs before every tool call.
set -- "${state}"/.pending-*
if [ ! -e "$1" ]; then hook_fired "$sid" relay-pending "nothing pending"; exit 0; fi

# Bob runs some tool calls in parallel, so two relays can see the same stash.
# Claim each file with an atomic mv; whoever loses the race has nothing to say.
claim="${state}/.claim-$$"
mkdir -p "$claim"
for f in "$@"; do mv "$f" "$claim/" 2>/dev/null; done
set -- "$claim"/.pending-*
if [ ! -e "$1" ]; then rmdir "$claim"; hook_fired "$sid" relay-pending "nothing pending"; exit 0; fi
services=$(for f in "$@"; do printf '%s ' "${f##*/.pending-}"; done)

{
  echo "BLOCKED (once): automated checks failed after your last edit — ${services}"
  echo "This tool call was not executed. Fix the problems below, then retry it."
  echo "If you are mid-change and expect these errors, just continue; checks rerun after every edit."
  echo
  cat "$@"
} > "${state}/.last-block"
rm -rf "$claim"

journal_add "$sid" "$(jq -nc \
  --arg t "$hook_ts" --argjson epoch "$hook_epoch" \
  --arg reason "checks failed: ${services}" \
  '{kind:"blocked", t:$t, epoch:$epoch, by:"check-edit", reason:$reason, subject:"(next tool call)"}')"

# stderr is shown to the agent on a block; .last-block is the fallback for
# clients that only report "blocked".
cat "${state}/.last-block" >&2
echo "(Full report: .bob/hooks/state/.last-block)" >&2
exit 2
