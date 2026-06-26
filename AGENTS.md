# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Footguns

- **MCP server MUST be created before FastAPI app** — [`server.py` line 22](booking_system_backend/server.py:22) instantiates `FastMCP` before `FastAPI`. Swapping the order breaks lifespan composition.
- **MCP tools bypass FastAPI DI** — they call `SessionLocal()` and `db.close()` directly; they do NOT use `Depends(get_db)`.
- **Service functions return Union types, not exceptions** — [`booking.py`](booking_system_backend/services/booking.py) returns `BookingOut | ErrorResponse`. Callers check `isinstance(result, ErrorResponse)`.
- **`book_flight()` validates both `user_id` AND `name`** — intentional non-standard security pattern; name mismatch rejects the booking.
- **SQLite is the production database** — `DATABASE_URL` is intentionally unset on ECS; [`db.py`](booking_system_backend/db.py) defaults to `./booking.db`. Data is ephemeral per container task.
- **`SEED_DEMO_DATA=true` re-seeds on every start** — but only if DB is empty (`seed.py` checks `User.count() > 0` first). Set to `false` if you need data to survive a restart.
- **Tests must patch `SessionLocal` in two places** — [`conftest.py` lines 49–50](booking_system_backend/tests/conftest.py:49) patches both `db.SessionLocal` and `server.SessionLocal`. Patching only one leaves the MCP tools hitting the real DB.
- **Java hold service requires Java 17 or 21** — Lombok does not support Java 22+. Set `JAVA_HOME` manually if sdkman auto-detect fails.
- **`docker-compose.yml` Java service is behind a profile** — uses `profiles: [hold-service]`. Use `docker compose --profile hold-service up`, or `e2e/docker-compose.e2e.yml` which enables it unconditionally.
- **Python proxy swallows Java 404s** — proxy endpoints in `server.py` catch `httpx.HTTPError` and return `{"error": "..."}` with HTTP 200. Callers must check the response body, not status code (see [`test_holds.py` line 82](e2e/test_holds.py:82)).
- **`holds.db` and `booking.db` are committed artefacts** — do not delete; they seed local dev.

## Commands

### Backend (Python / FastAPI)
- **Install:** `cd booking_system_backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- **Run:** `.venv/bin/python server.py` (listens on `:8001`)
- **Test (ALL):** `cd booking_system_backend && pytest` — **must run from this directory**, not project root
- **Single test:** `cd booking_system_backend && pytest tests/test_services.py::TestFlightService::test_list_flights_empty -v`
- **Single test file:** `cd booking_system_backend && pytest tests/test_rest.py -v`

### Java Hold Service (Spring Boot / Maven)
- **Run:** `cd booking_system_inventory_hold_service && mvn spring-boot:run` (requires Java 17 or 21; port 8080)
- **Test:** `cd booking_system_inventory_hold_service && mvn test`
- **Config override:** `PYTHON_BACKEND_URL` env var (default `http://localhost:8001`)

### Frontend (React / Vite)
- **Install:** `cd booking_system_frontend && npm install`
- **Dev:** `cd booking_system_frontend && npm run dev` (port 5173; proxies `/api` → `http://localhost:8001`)
- **Build:** `cd booking_system_frontend && npm run build` (runs `tsc -b && vite build`)
- **Lint:** `cd booking_system_frontend && npm run lint`

### Full Stack / E2E
- **Start all locally:** `./start.sh`
- **Docker Compose (backend + frontend):** `docker compose up`
- **Docker Compose (+ Java hold service):** `docker compose --profile hold-service up`
- **E2E tests:** `./test.sh` — builds full stack in Docker, waits for health, runs pytest
  - `E2E_BASE_URL=http://host:port` — skip compose, run against existing stack
  - `E2E_KEEP_STACK=1` — leave stack up after tests
  - `E2E_RUN_SLOW=1` — include the ~90s auto-expiry test

### Deploy
- **AWS:** `./scripts/aws/deploy-to-aws.sh`
- **IBM Cloud:** `./scripts/ibm/deploy-to-ibm.sh`

## Architecture

```
booking_system_backend/          Python/FastAPI service — REST API, MCP server, SQLite
  server.py                        Entry point; MCP tools + REST endpoints + Java proxy
  services/{booking,flight,user}.py  Business logic (no I/O except DB)
  models.py                        SQLAlchemy ORM models
  schemas.py                       Pydantic request/response schemas
  db.py                            Engine + SessionLocal + get_db()
  seed.py                          Demo data seeding (skips if DB non-empty; disabled in tests)
  tests/                           pytest suite; in-memory SQLite, StaticPool

booking_system_inventory_hold_service/   Java 17 / Spring Boot 3 — quote & hold lifecycle
  src/main/java/com/galaxium/holdservice/
    api/           REST controllers (Quote, Hold, Health)
    domain/        JPA entities (Quote, Hold, AuditEvent)
    service/       Business logic (QuoteService, HoldService, PricingService)
    scheduler/     HoldExpirationScheduler (runs every 60s, expires stale holds)
    client/        PythonBackendClient (RestTemplate → /internal/bookings/from-hold)
  application.properties  hold.duration.minutes=15; port=8080

booking_system_frontend/         React 19 + TypeScript + Vite + Tailwind
  src/
    pages/           Route-level components
    components/      Reusable UI pieces
    services/api.ts  All API calls — check `success:false` or `error` in body, NOT HTTP status
    types/index.ts   Single source of truth for all shared TypeScript types
    hooks/           Custom React hooks

e2e/                             pytest end-to-end suite (Docker Compose)
```

**Request flow (holds):** Frontend → `POST /quotes` (Python proxy) → Java `/api/v1/quotes` → `POST /api/v1/quotes/{id}/holds` → Python proxy → on confirm: Java calls Python `/internal/bookings/from-hold` to create real booking.

## Code Style & Conventions

### Python (Backend)
- snake_case for functions/variables; PascalCase for classes/Pydantic models
- Service functions return `T | ErrorResponse` — never raise exceptions for domain errors
- `ErrorResponse` has fields: `success=False`, `error`, `error_code`, `details`
- Pydantic models use `model_validate()` (not `.from_orm()`) — Pydantic v2 style
- No version pins in `requirements.txt` — all packages unpinned

### TypeScript (Frontend)
- Strict TypeScript: `strict`, `noUnusedLocals`, `noUnusedParameters` all enabled in [`tsconfig.app.json`](booking_system_frontend/tsconfig.app.json)
- All shared types in [`src/types/index.ts`](booking_system_frontend/src/types/index.ts) — single file, no module splitting
- API error detection: always call `assertNotProxyError(response.data)` for Java proxy endpoints (see [`api.ts`](booking_system_frontend/src/services/api.ts:161)); for direct endpoints, check `success` field or `error` key in body
- Axios interceptor in [`api.ts`](booking_system_frontend/src/services/api.ts:22) converts HTTP errors to `ErrorResponse` shape — HTTP status is not reliable
- Frontend `VITE_API_URL` env var sets base URL (default: `/api`, dev proxy rewrites to `http://localhost:8001`)
- Custom Tailwind tokens: `space-dark`, `space-blue`, `cosmic-purple`, `nebula-pink`, `alien-green`, `solar-orange`, `star-white` — do not assume standard Tailwind color names

### Java (Hold Service)
- Lombok `@Data`/`@Builder`/`@RequiredArgsConstructor` throughout — no manual getters/setters
- Service methods are `@Transactional`
- SQLite dialect: `org.hibernate.community.dialect.SQLiteDialect`

## Critical Patterns

- **New backend endpoint rule:** always add BOTH a REST handler in `server.py` AND a matching `@mcp.tool()` if the function should be agent-accessible
- **Hold duration changes:** if you modify `hold.duration.minutes` in `application.properties`, also update e2e timeout in `test_holds.py` accordingly
- **Seat class pricing:** multipliers are `economy=1.0x`, `business=2.5x`, `galaxium=5.0x` of `base_price` (defined in [`booking.py`](booking_system_backend/services/booking.py:8))
- **Flight seat columns:** three separate columns: `economy_seats_available`, `business_seats_available`, `galaxium_seats_available` — no single `seats_available` field

## Do Not Touch

- `booking_system_inventory_hold_service/target/` — Maven build output
- `booking_system_frontend/dist/` — Vite build output
- `scripts/terraform/.terraform/` — provider binaries
