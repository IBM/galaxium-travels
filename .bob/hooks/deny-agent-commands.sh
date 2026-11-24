#!/bin/sh
# PreToolUse (execute_command) — CI-only backstop for the Galaxium Bob Agent.
#
# The real guarantees live on GitHub, not here: the Main ruleset (pull request
# plus 1 approval; the agent's Write role cannot bypass it) and the scope of
# AGENT_GH_TOKEN (classic `repo`, no `workflow`). This hook stops the obvious
# footguns early with a clear reason, so a confused or prompt-injected run
# fails loudly in the log instead of quietly trying something.
#
# Pattern matching on a command line is not a sandbox: `sudo gh`, `/usr/bin/gh`
# or an alias would get past it. That is acceptable for a backstop.
#
# Only active on GitHub Actions. Local interactive sessions are not affected.

[ "${GITHUB_ACTIONS:-}" = "true" ] || exit 0

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.input.command // .tool_input.command // empty')
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')

# Start of a command inside a compound line: line start, or after ; & | ( ` $(
S='(^|[;&|(`]|\$\()[[:space:]]*'

reason=""
deny_if() {  # deny_if <extended-regex> <reason>
  [ -n "$reason" ] && return
  if printf '%s\n' "$cmd" | grep -Eq -- "$1"; then
    reason="$2"
  fi
}

deny_if "${S}gh[[:space:]]+pr[[:space:]]+(merge|close)([[:space:]]|\$)" \
  "merging or closing pull requests is for humans"
deny_if "${S}gh[[:space:]]+issue[[:space:]]+(close|delete|transfer|lock|pin)([[:space:]]|\$)" \
  "closing, deleting or moving issues is for humans"
deny_if "${S}gh[[:space:]]+(release|repo|secret|variable|workflow|ruleset|auth|ssh-key|gpg-key)([[:space:]]|\$)" \
  "releases, repository settings, secrets and auth are off limits"
deny_if "${S}gh[[:space:]]+api([[:space:]].*)?[[:space:]](-X|--method)[[:space:]=]*(DELETE|PUT)([[:space:]]|\$)" \
  "DELETE and PUT API calls (deleting things, merging) are off limits"
deny_if "${S}git[[:space:]]+push([[:space:]].*)?[[:space:]](-f|-d|--force|--force-with-lease|--force-if-includes|--delete|--mirror)([[:space:]=]|\$)" \
  "force-pushing and deleting branches are off limits"
deny_if "${S}git[[:space:]]+push([[:space:]].*)?[[:space:]:+](main|refs/heads/main)([[:space:]]|\$)" \
  "pushing to main is off limits; push the agent/issue-* branch and open a pull request"
deny_if "${S}git[[:space:]]+(-c|-C)[[:space:]]" \
  "git -c / git -C would skip the commit gate; use plain git commands from the repo root"
deny_if "${S}git[[:space:]].*--no-verify" \
  "--no-verify would skip checks"
deny_if "(GH_TOKEN|AGENT_GH_TOKEN|GITHUB_TOKEN|BOBSHELL_API_KEY|BOB_API_KEY|ACTIONS_RUNTIME_TOKEN|ACTIONS_ID_TOKEN_REQUEST_TOKEN)" \
  "commands must not reference tokens or API keys"
deny_if "${S}(printenv|env|set|export[[:space:]]+-p|declare[[:space:]]+-p)[[:space:]]*(\$|[;&|>])" \
  "printing the environment could leak secrets"
deny_if "(/proc/[^[:space:]]*/environ|extraheader|\.git/config)" \
  "reading process environments or git credentials could leak secrets"

if [ -z "$reason" ]; then
  hook_fired "$sid" deny-agent-commands "allowed"
  exit 0
fi

{
  echo "BLOCKED: this command is not allowed for the Galaxium Bob Agent: ${reason}."
  echo "Command: ${cmd}"
  echo
  echo "Do not try to work around this. If the task cannot be finished without it,"
  echo "follow the skill's failure step and hand the issue to a human."
} > "${hook_state}/.last-block"

journal_add "$sid" "$(jq -nc \
  --arg t "$hook_ts" --argjson epoch "$hook_epoch" \
  --arg subject "$(trunc "$cmd" 68)" \
  --arg reason "denied: $(trunc "$reason" 90)" \
  '{kind:"blocked", t:$t, epoch:$epoch, by:"deny-agent-commands", reason:$reason, subject:$subject}')"

cat "${hook_state}/.last-block" >&2
exit 2
