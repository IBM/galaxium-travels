# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Critical Non-Obvious Patterns

### Backend Architecture
- **MCP server MUST be created before FastAPI app** (line 16 in server.py) - MCP lifespan must be combined with FastAPI lifespan
- **MCP tools manually create/close DB sessions** - They use `SessionLocal()` directly, not FastAPI's dependency injection
- **Service functions return Union types** - Return either success model OR ErrorResponse, not exceptions (see booking.py)
- **Name verification required for bookings** - book_flight() validates both user_id AND name match (non-standard security pattern)

### Testing
- **Tests use in-memory SQLite with StaticPool** - Required for thread safety in tests (conftest.py line 21)
- **Monkeypatch SessionLocal in tests** - Must patch both `db.SessionLocal` and `server.SessionLocal` (conftest.py lines 49-50)
- **Seed function disabled in tests** - Explicitly patched to prevent data pollution (conftest.py line 53)
- Run single test: `cd booking_system_backend && pytest tests/test_services.py::test_name -v`

### Frontend
- **API base URL from env var** - Uses `import.meta.env.VITE_API_URL` (not process.env)
- **Error responses have specific structure** - Check `success: false` field, not HTTP status codes (api.ts line 112)
- **Custom Tailwind colors** - Space-themed palette defined in tailwind.config.js (not standard Tailwind)

## Commands
- **Backend tests**: `cd booking_system_backend && pytest` (must run from backend dir)
- **Frontend dev**: `cd booking_system_frontend && npm run dev`
- **Start both**: `./start.sh` (creates venv, installs deps, starts both servers)