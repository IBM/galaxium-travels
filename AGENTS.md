# AGENTS.md

This file provides guidance to agents when working with code in this repository.

This is a demo system mimicking enterprise challenges to showcase AI-native IDE capabilities.

## Critical Non-Obvious Patterns

### Backend Architecture
- **MCP server MUST be created before FastAPI app** (server.py line 22) - MCP lifespan must be combined with FastAPI lifespan
- **MCP tools manually create/close DB sessions** - They use `SessionLocal()` directly, not FastAPI's dependency injection
- **Service functions return Union types** - Return either success model OR ErrorResponse, not exceptions (see booking.py)
- **Name verification required for bookings** - book_flight() validates both user_id AND name match (non-standard security pattern)
- **SQLite is the production database** - No external DB; `DATABASE_URL` env var is intentionally unset in ECS so db.py defaults to SQLite
- **Data is ephemeral in ECS** - SQLite file lives on container filesystem; demo data re-seeds on every task start via `SEED_DEMO_DATA=true`
- **Price multipliers in booking service** - Seat class prices calculated via SEAT_CLASS_MULTIPLIERS dict (booking.py line 8), not stored in DB
- **Infant booking support** - Bookings can include 0-2 infants (lap children) via `infant_count` field; infants don't require seats and travel free

### Testing
- **Tests use in-memory SQLite with StaticPool** - Required for thread safety in tests (conftest.py line 21)
- **Monkeypatch SessionLocal in tests** - Must patch both `db.SessionLocal` and `server.SessionLocal` (conftest.py lines 49-50)
- **Seed function disabled in tests** - Explicitly patched to prevent data pollution (conftest.py line 53)
- **Run single test**: `cd booking_system_backend && pytest tests/test_services.py::test_name -v`

### Frontend
- **API base URL from env var** - Uses `import.meta.env.VITE_API_URL` (not process.env), see src/services/api.ts line 15
- **Error responses have specific structure** - Backend returns `{success: false, error, error_code, details}`, check success field not HTTP status
- **Custom Tailwind colors** - Space-themed palette defined in tailwind.config.js (not standard Tailwind): space-dark, cosmic-purple, nebula-pink, etc.

## Commands
- **Backend tests**: `cd booking_system_backend && pytest` (must run from backend dir)
- **Frontend dev**: `cd booking_system_frontend && npm run dev`
- **Start both**: `./start.sh` (wrapper to deployment_scripts/local/start_locally.sh)
- **Deploy AWS**: `./deployment_scripts/aws/deploy-to-aws.sh`
- **Deploy IBM**: `./deployment_scripts/ibm/deploy-to-ibm.sh`
- **Test containers**: `./deployment_scripts/local/test-containers.sh`

## Java Hold Service
- **Directory**: `booking_system_inventory_hold_service/` (currently empty - not yet implemented)
- **Purpose**: Planned Spring Boot service for managing temporary seat holds
- **Status**: The startup script gracefully skips this service if not present