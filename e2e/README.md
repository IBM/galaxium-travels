# End-to-end tests

Black-box tests that exercise the **whole system** the way the frontend does:
they drive the Python backend's public REST API, which proxies to the Java hold
service, which calls back into Python to create real bookings. This is the
cross-service path that's painful to verify by hand.

Unit tests (`booking_system_backend/tests/`) mock everything, so they never
catch bugs in that round trip — these do.

## Run it

### Native — recommended here (`run-native.sh`)

```bash
./run-native.sh                 # start backend + java jar, run tests, tear down
E2E_RUN_SLOW=1 ./run-native.sh  # also runs the ~90s hold auto-expiry test
```

Runs the Python backend (throwaway SQLite) and the prebuilt Java jar directly —
no Docker, no VM, no amd64 emulation. Fast (~65s) and reliable. Nothing touches
your dev `booking.db` / `holds.db`.

Requirements:
- `booking_system_backend/.venv` exists with deps installed.
- `booking_system_inventory_hold_service/target/inventory-hold-service-1.0.0.jar`
  exists. **Build it with Java 17** — the pinned Lombok doesn't compile under
  newer JDKs (this machine has Java 25). Either `cd` into the service and
  `mvn package -DskipTests` with a JDK 17, or extract it from the built image:
  ```bash
  cid=$(docker create galaxium_e2e-java-service:latest)
  docker cp $cid:/app/app.jar booking_system_inventory_hold_service/target/inventory-hold-service-1.0.0.jar
  docker rm $cid
  ```

### Docker (`run.sh`)

```bash
./run.sh                 # builds + starts the full stack, runs tests, tears it down
E2E_RUN_SLOW=1 ./run.sh
```

Brings up the stack defined in `docker-compose.e2e.yml` (backend + java, SQLite,
no Postgres). **Heads up:** on this machine the Rancher Desktop VM disk is only
~2.9 GB. The images *build*, but launching the containers (which unpacks image
layers into a second on-disk copy) runs out of space. Until the VM disk is
enlarged (Rancher Desktop → Troubleshooting → Factory Reset, or a disk-size
bump), use `run-native.sh`. The Docker path is kept for CI / bigger machines.

### Against an already-running stack (quick smoke)

If you already have a backend up, skip the managed stack and point the tests at
it (the hold tests need the Java service reachable via that backend's
`JAVA_SERVICE_URL`):

```bash
E2E_BASE_URL=http://localhost:8001 ./run.sh
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
| `E2E_BASE_URL` | Run against an existing backend instead of managing compose |
| `E2E_KEEP_STACK=1` | Leave the compose stack up after the run (debugging) |
| `E2E_RUN_SLOW=1` | Include the auto-expiry test |

The managed stack runs on ports **18001** (backend) and **18082** (Java) so it
won't collide with a dev stack on 8001/8082. Config lives in
`docker-compose.e2e.yml`, where the hold duration is shortened to 1 minute so
expiry is testable.
