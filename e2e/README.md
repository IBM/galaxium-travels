# End-to-end tests

Black-box tests that exercise the **whole system** the way the frontend does:
they drive the Python backend's public REST API, which proxies to the Java hold
service, which calls back into Python to create real bookings. This is the
cross-service path that's painful to verify by hand.

Unit tests (`booking_system_backend/tests/`) mock everything, so they never
catch bugs in that round trip — these do.

## Run it

```bash
./run-native.sh                 # full run (also: ./test.sh from the repo root)
E2E_RUN_SLOW=1 ./run-native.sh  # also run the ~90s hold auto-expiry test
./run-native.sh -k confirm      # pass extra args to pytest
```

Starts the Python backend and Java hold service directly using throwaway SQLite
databases on ports 18001 and 18082 — no Docker required, and no clash with a dev
stack on 8001/8080. The Java jar is built automatically on first run
if it isn't already present.

Requirements:
- `booking_system_backend/.venv` exists with deps installed (`pip install -r requirements.txt`)
- `java` and `mvn` on `PATH`, with **Java 17 or 21** active — the pinned Lombok version does not compile under Java 22+

### Against an already-running stack

If you already have both services up, skip the managed startup and point the
tests at your running backend:

```bash
cd e2e
E2E_BASE_URL=http://localhost:8001 pytest
```

`run-native.sh` always starts its own services, so call `pytest` directly here,
with the packages in `e2e/requirements.txt` installed.

### Docker (CI / other environments)

`docker-compose.e2e.yml` defines a self-contained stack (backend + Java service,
SQLite, no Postgres) that `conftest.py` brings up automatically when
`E2E_BASE_URL` is not set. Useful in CI where Docker is available but a local
JDK is not:

```bash
cd e2e && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt
E2E_BASE_URL=   # unset — conftest will manage compose
.venv/bin/pytest
```

## What it covers

`test_smoke.py`
- backend health, flight listing
- booking happy path (seat decrements)
- booking rejected on name mismatch / unknown flight

`test_holds.py`
- **quote → hold → confirm** creates a real booking and decrements a seat
- **release** consumes no seat
- **confirm is idempotent** (no double booking / double decrement)
- hold on an unknown quote returns an error (not a phantom hold)
- **auto-expiry** (opt-in via `E2E_RUN_SLOW=1`): unconfirmed holds flip to
  `EXPIRED` and can't be confirmed

## Knobs

| Env var | Effect |
|---|---|
| `E2E_BASE_URL` | Run against an existing backend instead of starting services |
| `E2E_KEEP_STACK=1` | Leave the compose stack up after the run (Docker path only) |
| `E2E_RUN_SLOW=1` | Include the auto-expiry test (~90s) |

Both the native and the Docker-managed stacks run on ports **18001** (backend) and
**18082** (Java), so they won't collide with a dev stack on 8001/8080.
