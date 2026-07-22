# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-obvious coding rules

- **MCP server before FastAPI** — `mcp = FastMCP(...)` must appear before `app = FastAPI(...)` in [`server.py`](../../booking_system_backend/server.py:22); lifespan composition breaks otherwise.
- **MCP tools use raw `SessionLocal()`** — do NOT use `Depends(get_db)` inside `@mcp.tool()` functions; always call `db = SessionLocal()` / `db.close()` directly.
- **Service functions return `Union`, not exceptions** — check `isinstance(result, ErrorResponse)` before treating a return value as success; never assume a non-None return is valid.
- **Patch `SessionLocal` in two places in tests** — [`conftest.py`](../../booking_system_backend/tests/conftest.py:49) must patch both `db.SessionLocal` and `server.SessionLocal`; patching only one leaves MCP tools hitting the real DB.
- **`book_flight()` validates name AND user_id together** — a valid `user_id` with a mismatched `name` returns `NAME_MISMATCH`, not `USER_NOT_FOUND`.
- **Hold storage is per-user, not global** — [`holdStorage.ts`](../../booking_system_frontend/src/utils/holdStorage.ts) keys by `galaxium_holds_<userId>`; always pass `userId`.
- **User auth is context-only** — use `useUser()` hook (throws if called outside `UserProvider`); do not read `localStorage` directly for user state.
- **Frontend date/number formatting** — use helpers in [`formatters.ts`](../../booking_system_frontend/src/utils/formatters.ts); avoid raw `Intl` or `Date` formatting elsewhere.
- **New backend endpoint checklist:** add (1) REST handler in `server.py`, (2) matching `@mcp.tool()` in `server.py`, (3) service function in `services/`.
- **Java Lombok** — no manual getters/setters/constructors; use `@Data`/`@Builder`/`@RequiredArgsConstructor`. All service methods are `@Transactional`.
- **`target/` and `dist/` are build outputs** — never edit files inside `booking_system_inventory_hold_service/target/` or `booking_system_frontend/dist/`.
