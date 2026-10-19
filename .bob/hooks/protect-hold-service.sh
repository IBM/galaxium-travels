#!/bin/sh
# PreToolUse: block Bob's file edits inside the Java hold service.
FILE_PATH=$(python3 -c "import sys, json; print(json.load(sys.stdin)['tool_input'].get('path', ''))")
case "$FILE_PATH" in
  booking_system_inventory_hold_service/*|*/booking_system_inventory_hold_service/*)
    echo "Blocked: this course doesn't change the Java hold service." >&2
    exit 2
    ;;
esac
exit 0
