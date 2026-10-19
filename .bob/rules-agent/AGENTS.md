# Agent Coding Rules

## Non-Obvious Patterns to Follow

- **New FastAPI route = new MCP tool automatically.** `fastapi-mcp` reflects all routes — no registration step needed.
- **Service layer pattern is mandatory.** Business logic goes in `booking_system_backend/services/`, returns `ErrorResponse` on failure. Routes only do `isinstance` check + `raise HTTPException`. Never raise from service functions.
- **`ruff.toml` ignores `B008`** — `Depends()` in function signatures is intentional; don't refactor it away.
- **Backend tests must run from `booking_system_backend/`** — `pytest.ini` sets `testpaths = tests`. Running `pytest` from repo root won't pick up backend tests.
- **E2E tests require both services running** — `./test.sh` handles this; don't try to run `e2e/` pytest directly without the services up.
- **Java build requires Java 17 or 21.** Lombok does not compile under Java 22+. Check `java -version` before attempting a build.
- **Proxy error pattern**: Python `/quotes` and `/holds/**` endpoints return `{"error": "..."}` with HTTP 200 on Java unavailability. Always call `assertNotProxyError(response.data)` in frontend after these calls.
- **Frontend env var**: `VITE_API_URL` must be set for local dev (defaults to `/api` which only works via Docker reverse proxy).
- **DB schema is auto-created** by SQLAlchemy `create_all` on startup — no migration files exist.
- **Both spellings of "cancelled"** exist in `BookingStatus` enum (`CANCELLED`/`CANCELED`) by design — don't remove the alias.
