<!-- STAND-IN: replace with the /init output from the module 1 authoring run. -->
# AGENTS.md

Galaxium Travels is a demo interplanetary booking system with three services.

## Services

| Service | Folder | Stack | Port |
|---|---|---|---|
| Front end | `booking_system_frontend/` | React, TypeScript, Vite | 5173 |
| Back end | `booking_system_backend/` | Python, FastAPI, SQLAlchemy, SQLite; REST and MCP | 8001 |
| Inventory hold service | `booking_system_inventory_hold_service/` | Java 17, Spring Boot | 8080 |

Seat holds go quote → hold → confirm through the Java service. On confirm, the Java service calls `POST /internal/bookings/from-hold` on the back end, which creates the booking. Unconfirmed holds expire after 15 minutes.

## Commands

- Start everything: `./start.sh`
- Backend tests: `cd booking_system_backend && .venv/bin/pytest -q`
- Frontend lint and build: `cd booking_system_frontend && npm run lint && npm run build`
- End-to-end tests (needs Java 17 or 21 and Maven): `./test.sh`

## Conventions

- Business logic lives in `booking_system_backend/services/`. Service functions return a result model or an `ErrorResponse` with an `error_code`; `server.py` maps error codes to HTTP status codes.
- Request and response models live in `booking_system_backend/schemas.py`; ORM models in `models.py`.
- Backend tests use an in-memory SQLite database from `tests/conftest.py`.
