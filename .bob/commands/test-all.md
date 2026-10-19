---
description: Run the backend tests, the end-to-end tests, and the frontend lint and build
---
From the repository root, run these in order:
1. `cd booking_system_backend && .venv/bin/pytest -q`
2. `./test.sh`
3. `cd booking_system_frontend && npm run lint && npm run build`

Report the result of each step. If anything fails, show the first failure and stop. Don't change any code.
