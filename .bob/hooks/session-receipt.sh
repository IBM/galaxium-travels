#!/bin/sh
# Stop — render the session journal into a human-readable receipt.
#
# The Stop payload is only {event, session_id}, so everything interesting here
# was recorded during the session by record-prompt.sh, record-tool.sh, and the
# two PreToolUse gates. This hook is pure rendering: read the journal, lay it
# out, append to the audit log, then drop the journal.
#
# Non-blocking by contract: exit 2 is ignored, the session has already ended.

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

journal=$(journal_for "$sid")
log="${hook_state}/audit.log"
rule="════════════════════════════════════════════════════════════════════════"

# Prepended to every render expression: truncate to fit the box, and mark the
# cut so a clipped command never reads as if it were the whole command.
JQ_CUT='def cut($n): if (length > $n) then .[0:$n-1] + "…" else . end; '

if [ ! -s "$journal" ]; then
  {
    echo "$rule"
    echo " BOB SESSION RECEIPT   ${sid}"
    echo " ${hook_ts} — no recorded activity"
    echo "$rule"
    echo
  } >> "$log"
  exit 0
fi

# ---------------------------------------------------------------- summary ---
prompts=$(jq -s '[.[]|select(.kind=="prompt")]|length'              "$journal")
tools=$(jq -s   '[.[]|select(.kind=="tool")]|length'                "$journal")
writes=$(jq -s  '[.[]|select(.kind=="tool" and .write)]|length'     "$journal")
errors=$(jq -s  '[.[]|select(.kind=="tool" and (.ok|not))]|length'  "$journal")
blocks=$(jq -s  '[.[]|select(.kind=="blocked")]|length'             "$journal")
bytes=$(jq -s   '[.[]|select(.kind=="tool")|.bytes]|add // 0'       "$journal")

start_epoch=$(jq -s 'min_by(.epoch).epoch' "$journal")
start_ts=$(jq -rs 'min_by(.epoch).t'       "$journal")
elapsed=$(( hook_epoch - start_epoch ))
duration="$(( elapsed / 60 ))m $(( elapsed % 60 ))s"

{
  echo "$rule"
  echo " BOB SESSION RECEIPT"
  echo " session  ${sid}"
  echo " repo     $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)@$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo " window   ${start_ts} → ${hook_ts}  (${duration})"
  echo " totals   ${prompts} prompt(s) · ${tools} tool call(s) · ${writes} write(s) · ${errors} error(s) · ${blocks} block(s)"
  echo " returned ${bytes} bytes of tool output"
  echo "$rule"

  # ------------------------------------------------------------- prompts ---
  if [ "$prompts" -gt 0 ]; then
    echo
    echo " PROMPTS"
    jq -rs "$JQ_CUT"'[.[]|select(.kind=="prompt")] | to_entries[] |
      "  \(.key+1|tostring|(" "*(2-length))+.). \(.value.t[11:19])  \"\(.value.text|cut(58))\""' "$journal"
  fi

  # --------------------------------------------------------------- tools ---
  # Cap the transcript: a long session should not bury the summary. The counts
  # above stay accurate regardless of what is elided here.
  if [ "$tools" -gt 0 ]; then
    echo
    echo " TOOL CALLS"
    # Recorded wide, rendered narrow: the journal keeps the fuller text and the
    # slices here just keep every line inside the rule.
    jq -rs "$JQ_CUT"'[.[]|select(.kind=="tool")] | .[0:25][] |
      "  \(.t[11:19])  \(.tool[0:17] + " "*(17-(.tool[0:17]|length)))  " +
      "\(.subject|cut(41))\n" +
      "            \(if .ok then "→" else "✗" end) " +
      "\(if .lines > 0 then "\(.lines) line(s), \(.bytes)B" else "no output" end)" +
      "\(if (.preview|length) > 0 then "\n            ⟨\(.preview|cut(56))⟩" else "" end)"' "$journal"
    [ "$tools" -gt 25 ] && echo "  … and $(( tools - 25 )) more tool call(s)"
  fi

  # --------------------------------------------------------------- files ---
  files=$(jq -rs '[.[]|select(.kind=="tool" and .write and (.path|length)>0)|.path]|unique[]' "$journal")
  if [ -n "$files" ]; then
    echo
    echo " FILES WRITTEN"
    printf '%s\n' "$files" | sed 's/^/  • /'
  fi

  # -------------------------------------------------------------- blocks ---
  if [ "$blocks" -gt 0 ]; then
    echo
    echo " POLICY BLOCKS"
    jq -rs "$JQ_CUT"'[.[]|select(.kind=="blocked")][] |
      "  \(.t[11:19])  [\(.by)] \(.reason|cut(52))\n            command: \(.subject|cut(48))"' "$journal"
  fi

  # ------------------------------------------------------------- verdict ---
  echo
  dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$blocks" -gt 0 ]; then
    echo " VERDICT  ${blocks} action(s) refused by policy · ${dirty} file(s) left uncommitted"
  else
    echo " VERDICT  no policy violations · ${dirty} file(s) left uncommitted"
  fi
  echo "$rule"
  echo
} >> "$log"

rm -f "$journal"
exit 0
