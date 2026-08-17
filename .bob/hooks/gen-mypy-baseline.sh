#!/bin/sh
# Regenerate the mypy baseline.
#
# This repo has pre-existing mypy errors (mostly SQLAlchemy Column[...] typing in
# services/). Without a baseline the PostToolUse hook would replay all of them
# after every Python edit and send the agent chasing errors it did not cause.
#
# Errors are normalised to "file: error: message [code]" with the line number
# stripped, so unrelated edits shifting line numbers do not register as new.
# The mypy invocation MUST stay identical to the one in mypy-check.sh, or the
# paths will not line up and every error will look new.
#
# Run this manually after intentionally fixing or accepting type errors:
#   sh .bob/hooks/gen-mypy-baseline.sh
root=$(git rev-parse --show-toplevel)
out="${root}/.bob/hooks/mypy-baseline.txt"

(cd "${root}/booking_system_backend" && \
  .venv/bin/mypy . --ignore-missing-imports --show-error-codes 2>&1) \
  | sed 's/:[0-9][0-9]*:/:/' \
  | grep ': error:' \
  | sort -u > "$out"

echo "baseline: $(wc -l < "$out" | tr -d ' ') known error(s) -> ${out}"
