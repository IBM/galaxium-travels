#!/bin/sh
# Stop — render this turn's journal into a short, human-readable receipt.
#
# Stop fires at the end of every TURN, not once per session, so each receipt
# covers one prompt and its work. The question a reader has is "what did Bob
# change, what did the checks say, and did he fix it?" -- so the receipt is a
# timeline of edits, commands, check results and blocks. Reads are only counted.
# It ends with a table of every hook that fired this turn and what it decided.
#
# One file per turn: state/receipts/<UTC start>_<session prefix>.txt, so files
# sort chronologically and a session's turns share a suffix.
#
# The Stop payload is only {event, session_id}; everything here was recorded
# during the turn by record-prompt.sh, record-tool.sh, check-edit.sh and the
# PreToolUse gates.
#
# Non-blocking by contract: exit 2 is ignored, the turn has already ended.

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

journal=$(journal_for "$sid")
[ -s "$journal" ] || exit 0

# The journal does not see this hook itself -- it is the one doing the writing.
hook_fired "$sid" session-receipt "wrote this receipt"

start=$(jq -rs 'min_by(.epoch).t' "$journal" | tr -d ':-' | sed 's/T/_/; s/Z$//')
mkdir -p "${hook_state}/receipts"
out="${hook_state}/receipts/${start}_$(printf '%s' "$sid" | cut -c1-8).txt"

jq -rs --argjson now "$hook_epoch" --arg sid "$sid" \
  --arg repo "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)@$(git rev-parse --short HEAD 2>/dev/null)" '
  def cut($n): if (length > $n) then .[0:$n-1] + "…" else . end;
  def hms: .t[11:19];
  def mins($s): if $s >= 60 then "\($s/60|floor)m \($s%60)s" else "\($s)s" end;
  def pad: "          ";

  . as $all
  | ($all | map(select(.kind=="prompt")) | first) as $prompt
  | ($all | min_by(.epoch).epoch)                as $start
  | ($all | map(select(.kind=="tool")))          as $tools
  | ($tools | map(select(.write)))               as $edits
  | ($tools | map(select((.write|not) and .tool != "execute_command"))) as $looks

  # Walk the journal in order, carrying which services are currently red so a
  # passing check can say what it fixed.
  | reduce $all[] as $e ({lines: [], red: {}, edits: 0, last: {}};
      if $e.kind == "tool" and $e.write then
        .edits += 1
        | .lines += ["  \($e|hms)  edit  \($e.path // $e.subject | cut(52))"]
      elif $e.kind == "tool" and $e.tool == "execute_command" then
        .lines += ["  \($e|hms)  run   \($e.subject | cut(52))"
                   + (if $e.ok then "" else "\n\(pad)  ✗ \($e.preview | cut(56))" end)]
      elif $e.kind == "tool" and ($e.ok | not) then
        .lines += ["  \($e|hms)  ✗ \($e.tool) \($e.subject | cut(44))\n\(pad)    \($e.preview | cut(56))"]
      elif $e.kind == "check" then
        .last[$e.service] = $e.ok
        | if $e.ok then
            (if .red[$e.service] then
               " — fixed after \(.edits - .red[$e.service].edits) edit(s), \(mins($e.epoch - .red[$e.service].epoch))"
             else "" end) as $fixed
            | .lines += ["\(pad)  ✓ \($e.service) checks (\($e.secs)s)\($fixed)"]
            | .red |= del(.[$e.service])
          else
            .lines += ["\(pad)  ✗ \($e.service): \($e.detail | cut(58))"]
            | .red[$e.service] = (.red[$e.service] // {epoch: $e.epoch, edits: .edits})
          end
      elif $e.kind == "blocked" and $e.by == "check-edit" then
        .lines += ["\(pad)  ↳ next tool call blocked once; report handed to Bob"]
      elif $e.kind == "blocked" then
        .lines += ["  \($e|hms)  ✗ commit refused (\($e.by)): \($e.reason | cut(46))"]
      else . end)

  | . as $walk
  | ($edits | map(.path // .subject) | unique) as $files
  | ($tools | map(select(.tool=="execute_command" and .ok
                         and (.subject|test("(^|[;&|] *)git +commit"))))) as $commits

  | ($all | any(.kind=="blocked" and .by=="gate-commit")) as $refused
  | "session \($sid) · \($repo) · \($prompt.t // "" | .[0:10])",
    "── \($prompt.t // "" | .[11:16]) \"\($prompt.text // "(no prompt recorded)" | cut(60))\""
    + (if ($tools|length) == 0 then "  · \(mins($now - $start)), no tool calls" else "" end),
    (if ($tools|length) > 0 then
       "   \(mins($now - $start)) · \($tools|length) tool call(s), \($looks|length) of them reads/lookups"
     else empty end),
    ($walk.lines[]),
    (if ($tools|length) > 0 then
       "   result: "
       + ([ $walk.last | to_entries[] | "\(.key) \(if .value then "✓" else "✗" end)" ]
          | if length > 0 then join(" · ") else "no checks ran" end)
       + " · \($files|length) file(s) changed"
       + (if ($commits|length) > 0 and ($refused|not) then " · committed" elif ($files|length) > 0 then " · not committed" else "" end)
     else empty end),
    "",
    "   hooks fired",
    ( def rpad($n): . + (" " * ([$n - length, 0] | max));
      def tally: group_by(.) | map("\(length)× \(.[0])") | join(" · ");
      def fires($hook): select(.kind=="hook" and .hook==$hook) | .outcome;
      [ ["SessionStart",     "preflight.sh",       [$all[] | fires("preflight")]],
        ["UserPromptSubmit", "record-prompt.sh",   [$all[] | select(.kind=="prompt") | "recorded prompt"]],
        ["PreToolUse",       "relay-pending.sh",   [$all[] | (fires("relay-pending"),
                                                     (select(.kind=="blocked" and .by=="check-edit") | "BLOCKED next call"))]],
        ["PreToolUse",       "gate-commit.sh",     [$all[] | (fires("gate-commit"),
                                                     (select(.kind=="blocked" and .by=="gate-commit") | "BLOCKED commit"))]],
        ["PostToolUse",      "record-tool.sh",     [$tools[] | "recorded tool call"]],
        ["PostToolUse",      "check-edit.sh",      [$all[] | (fires("check-edit"),
                                                     (select(.kind=="check") | "\(.service) \(if .ok then "✓" else "✗" end)"))]],
        ["Stop",             "session-receipt.sh", [$all[] | fires("session-receipt")]]
      ][]
      | select(.[2] | length > 0)
      | "   \(.[0] | rpad(17))\(.[1] | rpad(20))\(.[2] | length | tostring | rpad(4))\(.[2] | tally)"
    )
' "$journal" > "$out"

rm -f "$journal"
exit 0
