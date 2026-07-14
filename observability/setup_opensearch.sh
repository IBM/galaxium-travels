#!/usr/bin/env bash
# ============================================================
# setup_opensearch.sh
# ============================================================
# Run this ONCE after OpenSearch starts to register the index
# template and create the initial index.
# Usage: bash setup_opensearch.sh
# ============================================================

OPENSEARCH_HOST="${OPENSEARCH_HOST:-http://localhost:9200}"
OPENSEARCH_USER="${OPENSEARCH_USER:-admin}"
OPENSEARCH_PASS="${OPENSEARCH_PASS:-Galaxium2026Secure}"

echo "==> Registering index template: org-logs"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X PUT "${OPENSEARCH_HOST}/_index_template/org-logs" \
  -u "${OPENSEARCH_USER}:${OPENSEARCH_PASS}" \
  -H "Content-Type: application/json" \
  --data-binary @org-logs-template.json

echo "==> Creating initial index for today"
TODAY=$(date +%Y.%m.%d)
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X PUT "${OPENSEARCH_HOST}/org-logs-${TODAY}" \
  -u "${OPENSEARCH_USER}:${OPENSEARCH_PASS}" \
  -H "Content-Type: application/json"

echo "==> Setup complete. Index: org-logs-${TODAY}"
