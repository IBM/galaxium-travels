# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure

Monorepo with two independent sub-projects — all commands must be run from their subdirectory:
- `booking_system_backend/` — Python FastAPI backend
- `booking_system_frontend/` — React/TypeScript frontend

## Commands

### Backend (run from `booking_system_backend/`)
```bash
python server.py                          # Start server on port 8080
pytest                                    # Run all tests (verbose, short tracebacks)
pytest tests/test_rest.py                 # Run a single test file
pytest tests/test_rest.py::TestFlightsEndpoint::test_get_flights_empty  # Run single test
pytest --cov                              # Tests with coverage
```

### Frontend (run from `booking_system_frontend/`)
```bash
npm run dev       # Dev server on port 5173
npm run build     # tsc -b && vite build (type-check then bundle)
npm run lint      # ESLint on all .ts/.tsx files
npm run preview   # Preview production build
```

## Key Architecture Decisions

- **Dual protocol**: `server.py` exposes both REST (FastAPI) and MCP via `FastMCP`. The MCP server is created **before** the FastAPI app — order matters for lifespan composition. MCP is mounted at `/mcp`.
- **MCP tools use `SessionLocal()` directly** (not `Depends(get_db)`), because MCP tools run outside the FastAPI dependency injection context. REST endpoints use `Depends(get_db)`.
- **Error handling pattern**: Service functions return `SuccessSchema | ErrorResponse` (not exceptions). REST endpoints return `Union[SuccessOut, ErrorResponse]`; MCP tools check `isinstance(result, ErrorResponse)` and raise `Exception`.
- **DB seeding**: `seed()` runs on every app startup (in `lifespan`), wiping and re-inserting all demo data. Tests monkeypatch `server.seed` to `lambda: None`.
- **No migrations**: Schema is managed by `Base.metadata.create_all()`. There is no Alembic or migration system.

## Backend Patterns

- All imports in backend use **bare module names** (e.g. `from models import ...`, `from db import ...`), not package-relative paths — tests insert the parent directory into `sys.path` to make this work.
- Pydantic schemas use `class Config: from_attributes = True` for ORM → schema conversion; always use `Model.model_validate(orm_obj)` (not `.from_orm()`).
- Datetime strings stored as ISO strings in SQLite — format is `datetime.utcnow().isoformat() + "Z"` (no native datetime column type).
- Primary keys follow `{table_singular}_id` naming: `user_id`, `flight_id`, `booking_id`.
- `ErrorResponse` always has `success=False` (hardcoded default). MCP tools raise using `result.details or result.error` — `details` takes precedence over `error`.
- `POST /cancel/{booking_id}` — cancellation is a POST, not DELETE. All mutation endpoints are POST.
- `seats_available` on seeded flights is **not** consistent with the randomly seeded bookings — do not treat it as authoritative in tests.

## Frontend Patterns

- API base URL from `VITE_API_URL` env var, falling back to `http://localhost:8080`. Copy `.env.example` to `.env` for local dev.
- `isErrorResponse(response)` helper in `src/services/api.ts` — check `response.success === false` to discriminate union responses.
- User session persisted in `localStorage` under key `galaxium_user` via the `UserProvider` / `useUser` hook (`src/hooks/useUser.tsx`).
- Custom Tailwind theme colors (use these, don't invent new ones): `space-dark`, `space-blue`, `cosmic-purple`, `nebula-pink`, `alien-green`, `solar-orange`, `star-white`. Gradients: `space-gradient`, `cosmic-gradient`.
- TS strict mode + `noUnusedLocals` + `noUnusedParameters` + `verbatimModuleSyntax` — type imports must use `import type`.
- `erasableSyntaxOnly: true` is set — do not use TypeScript `enum` or `namespace`; use `const` objects or union string types instead.

## Testing

- Backend tests use an **in-memory SQLite** database (not the file-based `booking.db`). Each test function gets a fresh schema via `db_session` fixture (scope=`function`).
- The `client` fixture patches both `server.SessionLocal` and `db.SessionLocal` — if new modules import `SessionLocal`, add them to the monkeypatch in `conftest.py`.
- `pytest.ini` sets `addopts = -v --tb=short` — verbose output and short tracebacks are always on; no need to pass manually.
- Frontend has no test suite; `npm run build` serves as the integration check.
