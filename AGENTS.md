# AGENTS.md

This is a demo, that is supposed to mimic a real enterprise system! This is not a production system!
It is supposed to showcase different challenges that real enterprise systems face to show the capabilities of the AI-native IDE Bob.

This file provides guidance to agents when working with code in this repository.

## Critical Non-Obvious Patterns

### Backend Architecture
- **MCP server MUST be created before FastAPI app** (server.py line 22) - MCP lifespan must be combined with FastAPI lifespan
- **MCP tools manually create/close DB sessions** - They use `SessionLocal()` directly, not FastAPI's dependency injection
- **Service functions return Union types** - Return either success model OR ErrorResponse, not exceptions (see booking.py)
- **Name verification required for bookings** - book_flight() validates both user_id AND name match (non-standard security pattern)
- **SQLite is the production database** - No external DB; `DATABASE_URL` env var is intentionally unset in ECS so db.py defaults to SQLite
- **Data is ephemeral in ECS** - SQLite file lives on container filesystem; demo data re-seeds on every task start via `SEED_DEMO_DATA=true`
- **Seed only runs if DB empty** - seed.py checks `User.count() > 0` to avoid wiping registered users (line 15)

### Testing
- **Tests use in-memory SQLite with StaticPool** - Required for thread safety in tests (conftest.py line 21)
- **Monkeypatch SessionLocal in tests** - Must patch both `db.SessionLocal` and `server.SessionLocal` (conftest.py lines 49-50)
- **Seed function disabled in tests** - Explicitly patched to prevent data pollution (conftest.py line 53)
- Run single test: `cd booking_system_backend && pytest tests/test_services.py::test_name -v`

### Frontend
- **API base URL from env var** - Uses `import.meta.env.VITE_API_URL` (not process.env)
- **Error responses have specific structure** - Check `success: false` field, not HTTP status codes (api.ts interceptor)
- **Custom Tailwind colors** - IBM Carbon Design System palette in tailwind.config.js (not standard Tailwind)
- **Vite proxy in dev** - `/api` proxies to `http://localhost:8001` (vite.config.ts line 8-14)

## Commands
- **Backend tests**: `cd booking_system_backend && pytest` (must run from backend dir)
- **Start both**: `./start.sh` (wrapper to deployment_scripts/local/start_locally.sh)
- **Test containers**: `./deployment_scripts/local/test-containers.sh`

## Java Hold Service
- **Directory**: `booking_system_inventory_hold_service/` (currently empty - not yet implemented)
- **Status**: The startup script gracefully skips this service if not present (start_locally.sh line 92-150)