#!/bin/sh
# PostToolUse (write tools) — run the cheap checks for whichever service the
# edited file belongs to, and stash any failures for relay-pending.sh.
#
# PostToolUse stdout is discarded, so results cannot reach the agent from here.
# Instead each service gets its own stash file (state/.pending-<service>), which
# the PreToolUse relay turns into a one-off block on the agent's NEXT tool call.
# A passing run deletes that service's stash, so a mid-refactor failure that the
# next edit fixes is never reported.
#
# Budget: every check here finishes in a few seconds. Slow checks (Java unit
# tests, e2e) belong in gate-commit.sh or the verify skill, not here.

. "$(dirname "$0")/lib-journal.sh"

input=$(cat)
path=$(printf '%s' "$input" | jq -r '.input.path // .tool_input.path // .tool_input.file_path // empty')
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')
if [ -z "$path" ]; then hook_fired "$sid" check-edit "skipped: no file path"; exit 0; fi

root="$hook_root"
state="$hook_state"
rel="${path#"$root"/}"   # tools may report absolute or repo-relative paths

# Every run, pass or fail, goes in the journal so the receipt can show the
# edit -> check -> fix story, not just the failures.
record_check() {  # <service> <ok:true|false> <detail>
  journal_add "$sid" "$(jq -nc \
    --arg t "$hook_ts" --argjson epoch "$(date +%s)" \
    --arg service "$1" --argjson ok "$2" --arg path "$rel" \
    --argjson secs "$(( $(date +%s) - hook_epoch ))" --arg detail "$(trunc "$3" 120)" \
    '{kind:"check", t:$t, epoch:$epoch, service:$service, ok:$ok, path:$path, secs:$secs, detail:$detail}')"
}

# report <service> <label> <output>: stash a failure, capped so one bad edit
# cannot flood the agent's context.
report() {
  {
    echo "[$1] $2 failed after your edit to ${rel}:"
    printf '%s\n' "$3" | head -40
  } > "${state}/.pending-$1"
  # First meaningful line only: section labels and separators are not news.
  record_check "$1" false "$(printf '%s\n' "$3" | grep -vE '^(tsc -b:|eslint:|---)?$' | head -1)"
}

passed() {  # <service>
  rm -f "${state}/.pending-$1"
  record_check "$1" true ""
}

case "$rel" in
  # --------------------------------------------------------------- python ---
  booking_system_backend/*.py)   # case globs match across '/'
    venv="${root}/booking_system_backend/.venv/bin"
    [ -x "${venv}/pytest" ] || exit 0
    cd "${root}/booking_system_backend" || exit 0

    # This repo is not mypy-clean, so report only errors absent from the
    # baseline. Line numbers are stripped so shifted lines do not look new.
    # The invocation MUST match gen-mypy-baseline.sh.
    baseline="${root}/.bob/hooks/mypy-baseline.txt"
    [ -f "$baseline" ] || baseline=/dev/null
    new_types=""
    if [ -x "${venv}/mypy" ]; then
      new_types=$("${venv}/mypy" . --ignore-missing-imports --show-error-codes 2>&1 \
        | sed 's/:[0-9][0-9]*:/:/' | grep ': error:' | sort -u | comm -23 - "$baseline")
    fi

    tests=$("${venv}/pytest" -q -x 2>&1)
    tests_ok=$?

    if [ -n "$new_types" ] && [ $tests_ok -ne 0 ]; then
      report python "mypy (new errors) and pytest" "$new_types
---
$(printf '%s\n' "$tests" | tail -25)"
    elif [ -n "$new_types" ]; then
      report python "mypy (new errors only; baseline suppressed)" "$new_types"
    elif [ $tests_ok -ne 0 ]; then
      report python "pytest" "$(printf '%s\n' "$tests" | tail -30)"
    else
      passed python
    fi
    ;;

  # ------------------------------------------------------------- frontend ---
  booking_system_frontend/src/*.ts|booking_system_frontend/src/*.tsx)
    bin="${root}/booking_system_frontend/node_modules/.bin"
    [ -x "${bin}/tsc" ] || exit 0
    cd "${root}/booking_system_frontend" || exit 0

    types=$("${bin}/tsc" -b 2>&1);                     types_ok=$?
    lint=$("${bin}/eslint" "${rel#booking_system_frontend/}" 2>&1); lint_ok=$?

    if [ $types_ok -ne 0 ] || [ $lint_ok -ne 0 ]; then
      out=""
      [ $types_ok -ne 0 ] && out="tsc -b:
${types}"
      [ $lint_ok -ne 0 ] && out="${out}${out:+
---
}eslint:
${lint}"
      report frontend "tsc/eslint" "$out"
    else
      passed frontend
    fi
    ;;

  # ----------------------------------------------------------------- java ---
  booking_system_inventory_hold_service/src/*.java)
    use_supported_java || exit 0   # wrong JDK is an environment problem; preflight warns
    command -v mvn >/dev/null 2>&1 || exit 0
    cd "${root}/booking_system_inventory_hold_service" || exit 0

    # Compile only (main + test sources), ~2s. The unit suite runs at commit.
    out=$(mvn -q -o test-compile 2>&1)
    if [ $? -ne 0 ]; then
      # Keep only the compiler diagnostics; Maven repeats each one plus boilerplate.
      errs=$(printf '%s\n' "$out" | grep '\.java:\[' | sed "s|.*${root}/||" | sort -u)
      report java "mvn test-compile" "${errs:-$out}"
    else
      passed java
    fi
    ;;
  *)
    hook_fired "$sid" check-edit "skipped: no checks for this file type"
    ;;
esac

exit 0
