#!/bin/bash
# Convenience wrapper for local development startup
# This script is kept in the root for backward compatibility
# Actual script is in scripts/local/start_locally.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/deployment_scripts/local/start_locally.sh" "$@"

# Made with Bob
