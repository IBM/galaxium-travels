#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/booking_system_backend"
FRONTEND_DIR="$ROOT_DIR/booking_system_frontend"
JAVA_DIR="$ROOT_DIR/inventory_hold_service"

BACKEND_CMD='if [ -x "./.venv/bin/pytest" ]; then ./.venv/bin/pytest tests/test_services.py::TestBookingService::test_book_flight_with_valid_addons -v && ./.venv/bin/pytest tests/test_services.py::TestBookingService::test_book_flight_invalid_addon_fails -v && ./.venv/bin/pytest tests/test_services.py::TestBookingService::test_book_flight_price_tampering_fails -v && ./.venv/bin/pytest tests/test_services.py::TestBookingService::test_book_flight_ignores_unselected_addons -v && ./.venv/bin/pytest tests/test_rest.py::TestAddOnsEndpoint::test_get_addons_catalog -v && ./.venv/bin/pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_with_addons -v && ./.venv/bin/pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_invalid_addon_returns_400 -v && ./.venv/bin/pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_price_tampering_returns_400 -v && ./.venv/bin/pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_without_addons -v; else python3 -m pytest tests/test_services.py::TestBookingService::test_book_flight_with_valid_addons -v && python3 -m pytest tests/test_services.py::TestBookingService::test_book_flight_invalid_addon_fails -v && python3 -m pytest tests/test_services.py::TestBookingService::test_book_flight_price_tampering_fails -v && python3 -m pytest tests/test_services.py::TestBookingService::test_book_flight_ignores_unselected_addons -v && python3 -m pytest tests/test_rest.py::TestAddOnsEndpoint::test_get_addons_catalog -v && python3 -m pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_with_addons -v && python3 -m pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_invalid_addon_returns_400 -v && python3 -m pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_price_tampering_returns_400 -v && python3 -m pytest tests/test_rest.py::TestInternalBookingsFromHoldEndpoint::test_create_booking_from_hold_without_addons -v; fi'
FRONTEND_CMD='if [ -x "./node_modules/.bin/vitest" ]; then npm test -- --run src/test/addons.test.tsx; else echo "Missing frontend test dependencies. Run: cd booking_system_frontend && npm install"; exit 1; fi'
JAVA_CMD='mvn -Dtest=HoldServiceAddonsTest test'

declare -a SUITE_NAMES=(
  "Backend add-ons tests"
  "Frontend add-ons tests"
  "Java hold-service add-ons tests"
)

declare -a SUITE_DIRS=(
  "$BACKEND_DIR"
  "$FRONTEND_DIR"
  "$JAVA_DIR"
)

declare -a SUITE_CMDS=(
  "$BACKEND_CMD"
  "$FRONTEND_CMD"
  "$JAVA_CMD"
)

declare -a SUITE_LOGS=(
  "/tmp/galaxium_backend_addons_tests.log"
  "/tmp/galaxium_frontend_addons_tests.log"
  "/tmp/galaxium_java_addons_tests.log"
)

print_line() {
  printf '%s\n' "============================================================"
}

print_section() {
  print_line
  printf '%s\n' "$1"
  print_line
}

run_suite() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  local log="$4"

  print_section "RUNNING: $name"
  printf 'Directory: %s\n' "$dir"
  printf 'Command:   %s\n' "$cmd"
  printf 'Log file:  %s\n' "$log"
  printf '\n'

  (
    cd "$dir" || exit 1
    bash -lc "$cmd"
  ) >"$log" 2>&1
  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    printf 'RESULT: PASS - %s\n' "$name"
  else
    printf 'RESULT: FAIL - %s\n' "$name"
  fi

  printf '\nLast 20 log lines:\n'
  tail -n 20 "$log" 2>/dev/null || true
  printf '\n'

  return $exit_code
}

main() {
  local failures=0
  local passed=0
  local total=${#SUITE_NAMES[@]}
  local i

  print_section "GALAXIUM ADD-ONS TEST SUITE"
  printf 'Root directory: %s\n' "$ROOT_DIR"
  printf 'Started at:     %s\n' "$(date)"
  printf 'Suites:         %s\n\n' "$total"

  for ((i=0; i<total; i++)); do
    if run_suite "${SUITE_NAMES[$i]}" "${SUITE_DIRS[$i]}" "${SUITE_CMDS[$i]}" "${SUITE_LOGS[$i]}"; then
      passed=$((passed + 1))
    else
      failures=$((failures + 1))
    fi
  done

  print_section "SUMMARY"
  printf 'Passed: %s\n' "$passed"
  printf 'Failed: %s\n' "$failures"
  printf 'Total:  %s\n\n' "$total"

  for ((i=0; i<total; i++)); do
    if [ -f "${SUITE_LOGS[$i]}" ]; then
      if grep -q "RESULT: PASS" /dev/null 2>/dev/null; then
        :
      fi
    fi
    printf '%s\n' "- ${SUITE_NAMES[$i]} -> ${SUITE_LOGS[$i]}"
  done

  printf '\nFinished at: %s\n' "$(date)"

  if [ $failures -gt 0 ]; then
    exit 1
  fi
}

main "$@"

# Made with Bob
