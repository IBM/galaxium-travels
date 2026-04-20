# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Root [`start.sh`](start.sh) is only a backward-compatible wrapper; the real local startup script is [`deployment_scripts/local/start_locally.sh`](deployment_scripts/local/start_locally.sh).
- Local startup assumes three services and fixed ports: Python backend on 8001, Vite frontend on 5173, Java hold service on 8080; the script kills anything already bound to those ports before starting.
- Backend tests must be run from [`booking_system_backend/`](booking_system_backend) because [`pytest.ini`](booking_system_backend/pytest.ini) sets relative discovery to `tests`.
- Single backend test: [`pytest tests/test_services.py::test_name -v`](booking_system_backend/tests/test_services.py:1).
- Test isolation depends on in-memory SQLite with [`StaticPool`](booking_system_backend/tests/conftest.py:21) and monkeypatching both [`db.SessionLocal`](booking_system_backend/db.py:22) and [`server.SessionLocal`](booking_system_backend/server.py:10); patching only one leaves live DB calls in place.
- [`booking_system_backend/server.py`](booking_system_backend/server.py) creates the MCP server before the FastAPI app so lifespan wiring works; keep that order.
- MCP tools in [`booking_system_backend/server.py`](booking_system_backend/server.py) open/close [`SessionLocal`](booking_system_backend/db.py:22) manually instead of using FastAPI dependencies.
- Backend service layer returns success models or [`ErrorResponse`](booking_system_backend/schemas.py:85) unions instead of raising for business failures; callers are expected to branch on the response type.
- Booking security is intentionally unusual: [`book_flight()`](booking_system_backend/services/booking.py:15) verifies both `user_id` and `name`, and returns `NAME_MISMATCH` when only the name is wrong.
- Backend DB defaults to local SQLite in [`booking_system_backend/db.py`](booking_system_backend/db.py:7); this demo intentionally relies on file-backed SQLite when `DATABASE_URL` is unset.
- Frontend API code treats backend failures as payloads with [`success === false`](booking_system_frontend/src/services/api.ts:208), not just non-2xx responses.
- The Java hold-service proxy can also fail with HTTP 200 plus `{ "error": ... }`; quote/hold calls must pass through [`assertNotProxyError()`](booking_system_frontend/src/services/api.ts:161).
- Hold state shown in My Bookings is partly client-side: per-user hold records are stored in [`localStorage`](booking_system_frontend/src/utils/holdStorage.ts:7) under the `galaxium_holds_${userId}` key.
- The Java hold service uses its own SQLite file [`holds.db`](inventory_hold_service/src/main/resources/application.properties:6) and talks to the Python backend via [`PYTHON_BACKEND_URL`](inventory_hold_service/src/main/resources/application.properties:16).
- Hold confirmation is not idempotent in the usual REST sense: [`confirmHold()`](inventory_hold_service/src/main/java/com/galaxium/holdservice/service/HoldService.java:75) returns the existing record unchanged when already confirmed, but throws for any non-`HELD` status.