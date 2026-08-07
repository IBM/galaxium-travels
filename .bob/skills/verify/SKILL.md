---
name: verify
description: Run verification checks for the galaxium-travels repo. Use when the user asks to verify, validate, run tests, check lint, or confirm that changes are correct. Knows which checks are cheap (ruff, pytest, frontend lint) vs expensive (e2e). Runs cheap checks by default; only runs e2e when explicitly asked or when changes touch cross-service boundaries.
---

# Verify Skill — Galaxium Travels

This skill knows every test and lint suite in the repo. Follow the decision rules below to pick the right set of checks for the situation.

---

## Decision rules

**Always run (cheap, <5s each, no Docker):**
- Ruff lint
- Backend pytest

**Run when frontend files changed:**
- Frontend ESLint lint

**Run when explicitly asked, or when changes span the Python↔Java boundary (server.py proxy, holds endpoints, /internal/bookings/from-hold):**
- E2E tests

**Run when Java hold service files changed:**
- Java Maven tests

**Never run e2e speculatively** — they take 30–90 s and require Docker. Ask the user if unsure.

---

## Suites

### 1. Ruff lint — `<1s`
```bash
cd booking_system_backend && source .venv/bin/activate && ruff check .
```
- Config: `booking_system_backend/ruff.toml` (B008 suppressed — FastAPI Depends pattern)
- Can also be run from repo root: `ruff check .` picks up `e2e/` as well

### 2. Backend unit tests — `~2s`
```bash
cd booking_system_backend && source .venv/bin/activate && pytest
```
- 72 tests across `tests/test_services.py` (36) and `tests/test_rest.py` (36)
- In-memory SQLite, no Docker needed
- Config: `booking_system_backend/pytest.ini`
- Single test: `pytest tests/test_services.py::test_name -v`

### 3. Frontend lint — `~2s`
```bash
cd booking_system_frontend && npm run lint
```
- ESLint + TypeScript; runs from `booking_system_frontend/`

### 4. Frontend build (type-check + bundle) — `~10s`
```bash
cd booking_system_frontend && npm run build
```
- Runs `tsc -b` then Vite build — catches type errors that lint misses
- Run this when changing TypeScript types or when a full build check is warranted

### 5. Java tests — `~45s`
```bash
cd booking_system_inventory_hold_service && mvn test
```
- Requires Java 17 or 21 (Lombok fails on Java 22+)
- Set `JAVA_HOME` manually if sdkman is not available

### 6. E2E tests — `30–120s`, no Docker needed
```bash
./test.sh
```
- Delegates to `e2e/run-native.sh`, which starts the Python backend and Java hold service **natively as local processes** — no Docker required
- 10 tests: `test_smoke.py` (5) + `test_holds.py` (5)
- Prerequisites:
  - Backend venv must exist: `booking_system_backend/.venv` (run `pip install -r requirements.txt` if missing)
  - `java` (17 or 21) must be on PATH — Lombok fails under Java 22+
  - `mvn` must be on PATH for the **first run only** (builds the jar; subsequent runs reuse it)
- Useful flags:
  - `E2E_RUN_SLOW=1 ./test.sh` — include the ~90s hold auto-expiry test (normally skipped)
  - `./test.sh -k confirm` — pass pytest `-k` filter through
- **Docker fallback:** only used when running `cd e2e && pytest` directly *without* `E2E_BASE_URL` set — then `conftest.py` brings up `docker-compose.e2e.yml` automatically. This path requires Docker.

---

## Standard workflow

When the user asks to "verify" or "run checks" without specifying:

1. Run **ruff** and **pytest** together (they are independent, run in parallel if possible).
2. Report results. If both pass, declare clean. If frontend files were changed, also run **frontend lint**.
3. Only suggest e2e if: the user asks, or the diff touches `server.py` proxy routes, hold-service endpoints, or `/internal/bookings/from-hold`.

When the user asks to "run all tests" or "full verification":

1. Run ruff + pytest + frontend lint.
2. Ask: "E2E tests require Docker and take ~30–90s — run them too?"
3. If yes, run `./test.sh` (check Docker is available first).

---

## Reporting format

After each suite, report in one line:
- ✅ `ruff` — all checks passed
- ✅ `pytest` — 72 passed in 0.4s
- ❌ `pytest` — 2 failed (list failing test names and the error summary)

If asked specifically, create an HTML document. 

If any suite fails, stop and focus on fixing it before running the next suite.
