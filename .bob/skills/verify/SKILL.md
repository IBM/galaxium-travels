---
name: verify
description: Run verification checks for the galaxium-travels repo. Use after every implementation. Use when the user asks to verify, validate, run tests, check lint, or confirm that changes are correct. Knows which checks are cheap (ruff, pytest, frontend lint) vs expensive (e2e). Runs cheap checks by default; only runs e2e when explicitly asked or when changes touch cross-service boundaries.
---

# Verify Skill

Run the appropriate test suites for the galaxium-travels repo. Always execute commands directly — do not just describe what to run.

## Tiers

| Tier | Suites | Approx. time | When to use |
|---|---|---|---|
| **fast** (default) | backend pytest + frontend ESLint | ~15 s | Any verify/validate/test request without further qualification |
| **standard** | fast + Java unit tests | ~1 min | User says "standard", "including Java", "all unit tests", or Java files changed |
| **e2e** | standard + native e2e (no Docker) | ~3–5 min | User explicitly asks for e2e, integration, or cross-service testing |
| **full e2e** | e2e + slow auto-expiry test | ~5–6 min | User explicitly says "full e2e", "including slow", or asks about hold expiry |

## Step 1 — Determine tier

Read the user's request:
- Default to **fast** unless the user mentions Java, all-unit, standard, e2e, integration, cross-service, hold expiry, slow, or full.
- Upgrade to **standard** if the user mentions Java unit tests, all unit tests, or standard.
- Upgrade to **e2e** if the user mentions e2e, end-to-end, integration tests, or cross-service.
- Upgrade to **full e2e** only if the user explicitly mentions slow tests, full e2e, or hold auto-expiry.

## Step 2 — Detect changed files (git-aware skipping)

Run:
```bash
git diff --name-only HEAD 2>/dev/null || git diff --name-only
```

Parse the output to determine which components have changes:
- **Python backend changed**: any file under `booking_system_backend/`
- **Java service changed**: any file under `booking_system_inventory_hold_service/`
- **Frontend changed**: any file under `booking_system_frontend/`
- **e2e changed**: any file under `e2e/`
- **No output / untracked only / clean tree**: treat all components as changed (run everything in the selected tier)

If `git diff` returns nothing (e.g. clean working tree with no staged changes), also try:
```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null
```
If that also returns nothing, assume all components may be affected.

**Skipping rules (only apply within the selected tier):**
- Skip backend pytest if no Python backend files changed AND at least one other component changed.
- Skip Java unit tests if no Java service files changed AND at least one other component changed.
- Skip frontend lint if no frontend files changed AND at least one other component changed.
- Never skip e2e if e2e is in the selected tier — e2e always runs when requested.
- If only one component has changes, run only its suite(s) (even if the tier would normally include more).
- If changes span multiple components or the diff is empty, run all suites in the tier.

Always tell the user which suites you are running and why (e.g. "Skipping Java unit tests — no Java files changed").

## Step 3 — Run fast checks

### 3a. Backend pytest (~5–10 s)

Run only if Python backend is in scope:
```bash
cd booking_system_backend && python -m pytest -v --tb=short
```
- Working directory: `booking_system_backend/`
- Uses in-memory SQLite; no external services needed.
- Report: pass/fail count, any failures with tracebacks.

### 3b. Frontend ESLint (~3–5 s)

Run only if frontend is in scope:
```bash
cd booking_system_frontend && npm run lint
```
- Working directory: `booking_system_frontend/`
- Requires `node_modules` to be installed. If the command fails with "missing script" or "Cannot find module", first run `npm install` then retry.
- Report: lint warnings/errors or "no issues found".
- Note: the frontend has **no unit tests** — ESLint is the only automated check available.

## Step 4 — Run Java unit tests (standard tier and above)

Skip this step entirely if Java service is not in scope.

### 4a. Java preflight

Before running Maven, check the Java version:
```bash
java -version 2>&1 | head -1
```
Parse the major version number:
- Java 17 → ✅ proceed
- Java 21 → ✅ proceed
- Java 22+ → ⚠️ warn: "Lombok does not support Java 22+. Java tests may fail. Set JAVA_HOME to a Java 17 or 21 installation." Then skip `mvn test` for this run.
- Java not found → ⚠️ warn: "java not found on PATH. Skipping Java unit tests." Then skip.
- Java 8/11 → ⚠️ warn: "Java 17 or 21 required. Found Java X. Skipping Java unit tests." Then skip.

### 4b. Maven test (~30–45 s)

If preflight passes:
```bash
cd booking_system_inventory_hold_service && mvn test -q
```
- Working directory: `booking_system_inventory_hold_service/`
- Uses H2 in-memory DB; no external services needed.
- `-q` suppresses Maven download noise; failures still print.
- First run may take ~1–2 min if Maven downloads dependencies — tell the user this is expected.
- Report: test pass/fail count from Surefire output, any failures.

## Step 5 — Run e2e tests (e2e tier and above)

Skip this step if e2e is not in the selected tier.

**Prerequisites check** — before starting, verify:
```bash
which java && which mvn
```
If either is missing, warn and abort e2e: "e2e tests require both java and mvn on PATH."

Also verify the backend venv exists:
```bash
test -f booking_system_backend/.venv/bin/python
```
If missing, tell the user to run: `cd booking_system_backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`

### 5a. Fast e2e (~2–3 min)

```bash
./e2e/run-native.sh
```
- This script manages its own service lifecycle (starts Python backend + Java service, waits for health, runs pytest, cleans up).
- Do NOT pass `E2E_RUN_SLOW=1` unless this is a **full e2e** run.
- Do NOT use Docker compose; `run-native.sh` is the preferred path.
- Report: pytest output with pass/fail per test.

### 5b. Full e2e (includes slow auto-expiry test, ~5–6 min)

Only for **full e2e** tier:
```bash
E2E_RUN_SLOW=1 ./e2e/run-native.sh
```
- Adds `test_hold_auto_expiry` which polls for ~90 s waiting for the scheduler to expire an unconfirmed hold.
- Tell the user upfront: "Running full e2e including the ~90 s auto-expiry test."

## Step 6 — Summarise results

After all suites complete, print a summary table:

```
Suite               | Result  | Duration
--------------------|---------|----------
Backend pytest      | ✅ PASS | 8s
Frontend ESLint     | ✅ PASS | 4s
Java unit tests     | ⚠️ SKIP | (no Java files changed)
```

- Use ✅ PASS, ❌ FAIL, ⚠️ SKIP, or ⏭️ NOT IN TIER.
- If any suite failed, surface the failure output clearly and suggest a fix if one is obvious.
- If all pass: "All checks passed."
- If any failed: "X suite(s) failed — see output above."

## Reference: Test suite details

### Backend pytest
- **Location**: `booking_system_backend/tests/`
- **Files**: `test_rest.py` (35 tests), `test_services.py` (37 tests)
- **DB**: in-memory SQLite, fresh per test, auto-dropped
- **No external services needed**
- **Coverage flag**: add `--cov=services --cov=server` if user asks for coverage

### Frontend ESLint
- **Location**: `booking_system_frontend/`
- **Command**: `npm run lint`
- **No unit tests exist** — ESLint is the only automated frontend check

### Java unit tests
- **Location**: `booking_system_inventory_hold_service/src/test/`
- **Key files**: `HoldTest.java` (45 tests), `QuoteTest.java` (42 tests), `HoldControllerTest.java` (11 tests), `QuoteControllerTest.java` (7 tests), `HoldServiceApplicationTests.java` (6 integration tests), `PythonBackendClientTest.java` (7 tests)
- **DB**: H2 in-memory, `create-drop` per class
- **Framework**: JUnit 5 + Spring Boot Test + WireMock
- **Java requirement**: 17 or 21 only (Lombok incompatible with 22+)

### e2e (native, no Docker)
- **Runner**: `e2e/run-native.sh`
- **Fast tests** (9): `test_smoke.py` (5) + `test_holds.py` (4)
- **Slow test** (1): `test_hold_auto_expiry` — ~90 s, opt-in via `E2E_RUN_SLOW=1`
- **Services managed by script**: Python backend (port 8001) + Java hold service (port 8080)
- **DB**: throwaway SQLite files in temp dir, cleaned up on exit
- **Requires**: `java`, `mvn`, Python venv at `booking_system_backend/.venv`
- **Key env vars**:
  - `E2E_BASE_URL` — point to already-running backend (skip service startup)
  - `E2E_KEEP_STACK=1` — leave services up after tests (debugging)
  - `E2E_RUN_SLOW=1` — include auto-expiry test

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `ModuleNotFoundError` in pytest | venv not activated or deps missing | `cd booking_system_backend && pip install -r requirements.txt` |
| `npm run lint` fails with "Cannot find module" | `node_modules` missing | `cd booking_system_frontend && npm install` |
| `mvn test` fails with Lombok annotation errors | Java 22+ in use | Switch `JAVA_HOME` to Java 17 or 21 |
| e2e: "java not found" | Java not on PATH | Install Java 17/21 or set `JAVA_HOME` and add to `PATH` |
| e2e: Python backend won't start | Port 8001 in use or venv missing | Kill existing process or recreate venv |
| e2e: Java service health timeout | JAR not built yet (first run) | Run `cd booking_system_inventory_hold_service && mvn package -DskipTests` first |
| `SessionLocal` patches failing in backend tests | Running pytest from wrong directory | Must run from `booking_system_backend/`, not repo root |
