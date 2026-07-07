# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure

Two independent sub-projects — each must be run from its own directory:
- `booking_system_backend/` — Python/FastAPI backend
- `booking_system_frontend/` — React/TypeScript frontend

## Backend Commands (run from `booking_system_backend/`)

```bash
# Install deps
pip install -r requirements.txt

# Run server (port 8080)
python server.py

# Run all tests
pytest

# Run a single test function
pytest tests/test_rest.py::TestBookEndpoint::test_book_flight_success -v

# Run a single test file
pytest tests/test_services.py -v
```

## Frontend Commands (run from `booking_system_frontend/`)

```bash
npm install
npm run dev        # dev server on port 5173
npm run build      # tsc -b && vite build
npm run lint       # eslint
```

## Critical Architecture Notes

- The backend exposes **both REST and MCP** via the same FastAPI process. MCP server (`fastmcp`) is created first, then mounted into FastAPI at `/mcp`. The MCP server must be instantiated before the FastAPI app due to lifespan ordering.
- MCP tool functions in `server.py` manually open/close `SessionLocal` (not via `Depends`). REST endpoints use `Depends(get_db)`. These are two separate DB session patterns — do not mix them.
- **Error handling pattern**: service functions return `ErrorResponse` on failure instead of raising exceptions. REST endpoints return `Union[XxxOut, ErrorResponse]` with HTTP 200 for business logic errors. MCP tools raise `Exception` if the result is `ErrorResponse`.
- Database is SQLite (`booking.db`), created and seeded on every server startup via `lifespan`. The `seed()` function **clears all data and re-seeds** on each restart.

## Backend Code Style

- Imports are relative — no package; modules import each other directly (e.g., `from models import ...`, `from db import ...`). This requires `booking_system_backend/` to be the working directory or on `sys.path`.
- Service functions always take `db: Session` as first argument and return a typed Pydantic schema (`XxxOut | ErrorResponse`).
- Use `BookingOut.model_validate(orm_obj)` (Pydantic v2) — not `.from_orm()`.
- Booking statuses are string literals: `"booked"`, `"cancelled"`, `"completed"`.
- Date/time fields are stored as ISO 8601 strings, not native `datetime` objects.

## Testing Notes

- Tests use an in-memory SQLite database; `conftest.py` patches `SessionLocal` and `seed` via `monkeypatch` — **no real DB is touched during tests**.
- The `client` fixture patches both `db.SessionLocal` and `server.SessionLocal` separately — if a new module-level import of `SessionLocal` is added, it must also be patched.
- Tests are grouped in classes (`TestXxxEndpoint`, `TestXxxService`) but use plain `pytest` (no `unittest.TestCase`).

## Frontend Code Style

- All types are centralized in `src/types/index.ts` — add new API types there.
- API calls go through the singleton axios instance in `src/services/api.ts` (configured with `VITE_API_URL`).
- Use the exported `isErrorResponse(response)` helper from `src/services/api.ts` to discriminate `XxxOut | ErrorResponse` unions.
- Custom Tailwind colors: `cosmic-purple` (#6366F1), `nebula-pink` (#EC4899) — defined in `tailwind.config.js`.
- Frontend env var: `VITE_API_URL` (defaults to `http://localhost:8080`). Copy `.env.example` to `.env`.
