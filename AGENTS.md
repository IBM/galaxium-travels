# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

Galaxium Travels — a polyglot interplanetary flight booking system with three services:
- **`booking_system_backend/`** — Python FastAPI (REST + MCP server via `fastapi-mcp`)
- **`booking_system_frontend/`** — React 19 + TypeScript + Vite + Tailwind
- **`booking_system_inventory_hold_service/`** — Java 17 Spring Boot 3 (quotes/holds)
- **`e2e/`** — Python pytest end-to-end tests (run against live services)

## Commands

### Backend (run from `booking_system_backend/`)
```bash
# Setup
python -m venv .venv && .venv/bin/pip install -r requirements.txt

# Run
.venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001

# Test (all)
.venv/bin/pytest

# Test (single test)
.venv/bin/pytest tests/test_rest.py::test_function_name -v

# Lint
.venv/bin/ruff check .
```

### Frontend (run from `booking_system_frontend/`)
```bash
npm install
npm run dev       # Vite dev server (default port 5173)
npm run build     # tsc -b && vite build
npm run lint      # eslint
```
Frontend requires `VITE_API_URL=http://localhost:8001` (see `.env.example`).

### Java Hold Service (run from `booking_system_inventory_hold_service/`)
```bash
mvn package -DskipTests        # Build jar (requires Java 17 or 21 — Lombok breaks under Java 22+)
java -jar target/inventory-hold-service-1.0.0.jar
mvn test                        # Unit tests
```

### E2E Tests (run from repo root)
```bash
./test.sh                        # Full suite (starts backend + java service natively)
./test.sh -k test_function_name  # Single test
E2E_RUN_SLOW=1 ./test.sh         # Include ~90s hold auto-expiry test
```
E2E tests use throwaway SQLite DBs in a temp dir — they do not touch `booking.db` / `holds.db`.

### Docker (full stack)
```bash
docker compose up                              # Backend + frontend + postgres
docker compose --profile hold-service up       # Also include the Java hold service
```

## Critical Architecture Notes

- The backend's `root_path="/api"` means all routes are served under `/api` in Docker (e.g. `/api/flights`), but directly when running locally (`/flights`).
- FastAPI routes are **automatically exposed as MCP tools** via `fastapi-mcp` — adding a route adds an MCP tool. No separate registration needed.
- The Java service is **only accessible through the Python backend proxy endpoints** (`/quotes`, `/holds/**`). Direct Java API calls are not expected from the frontend.
- Python proxy endpoints return `{"error": "..."}` with **HTTP 200** when Java is unavailable. Axios won't reject these — use `assertNotProxyError()` in `src/services/api.ts` after every Java proxy call.
- Database: SQLite by default (`booking.db` / `holds.db`). Set `DATABASE_URL` env var for PostgreSQL (backend) or `SPRING_DATASOURCE_URL` for Java service.
- `SEED_DEMO_DATA=true` auto-populates the DB on backend startup; set to `false` in tests (handled automatically by conftest).

## Backend Patterns

- Service layer returns `ErrorResponse` (Pydantic model) on failure — never raises directly. Routes check `isinstance(result, ErrorResponse)` and then `raise HTTPException`.
- Seat class pricing: `base_price` = economy (1×). Business and galaxium prices are computed properties on `FlightOut`, not stored columns.
- Datetime stored as strings in format `YYYY-MM-DD HH:MM` (not ISO 8601 with seconds).
- `ruff` ignores `B008` — FastAPI `Depends()` in signatures is intentional.
- Test conftest patches `server.seed` to a no-op to prevent seeding during unit tests.

## Frontend Patterns

- All API calls go through the single axios instance in `src/services/api.ts`; never create new axios instances elsewhere.
- Types live in `src/types/index.ts`.
- `isErrorResponse()` helper in `api.ts` checks `response.success === false`.
