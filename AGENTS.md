# Galaxium Travels

A demo interplanetary flight-booking app that mimics a real enterprise system. Its purpose is to **showcase challenges agents face in a multi-service codebase** — not to run in production.

## Footguns

- **MCP server MUST be created before FastAPI app** — [`server.py` line 22](booking_system_backend/server.py:22) instantiates `FastMCP` before `FastAPI`. Swapping the order breaks lifespan composition.
- **MCP tools bypass FastAPI DI** — they call `SessionLocal()` and `db.close()` directly; they do NOT use `Depends(get_db)`.
- **Service functions return Union types, not exceptions** — [`booking.py`](booking_system_backend/services/booking.py) returns `BookingOut | ErrorResponse`. Callers check `isinstance(result, ErrorResponse)`.
- **`book_flight()` validates both `user_id` AND `name`** — intentional non-standard security pattern; name mismatch rejects the booking.
- **SQLite is the production database** — `DATABASE_URL` is intentionally unset on ECS; [`db.py`](booking_system_backend/db.py) defaults to `./booking.db`. Data is ephemeral per container task.
- **`SEED_DEMO_DATA=true` re-seeds on every start** — set to `false` if you need data to survive a restart locally.
- **Tests must patch `SessionLocal` in two places** — [`conftest.py` lines 49–50](booking_system_backend/tests/conftest.py:49) patches both `db.SessionLocal` and `server.SessionLocal`. Patching only one leaves the MCP tools hitting the real DB.
- **Java hold service requires Java 17 or 21** — Lombok does not support Java 22+. The start script auto-detects sdkman candidates; set `JAVA_HOME` manually if needed.
- **`docker-compose.yml` Java service is behind a profile** — it uses `profiles: [hold-service]`. Run `docker compose --profile hold-service up` to include it, or use `e2e/docker-compose.e2e.yml` which enables it unconditionally.
- **Python proxy swallows Java 404s** — proxy endpoints in `server.py` catch `httpx.HTTPError` and return `{"error": "..."}` with HTTP 200. Callers must check the response body, not just the status code (see [`test_holds.py` line 82](e2e/test_holds.py:82)).
- **`holds.db` and `booking.db` are committed artefacts** — do not delete; they seed local dev. They are regenerated on startup via `spring.jpa.hibernate.ddl-auto=update` and `SEED_DEMO_DATA=true`.

## Commands

### Backend (Python / FastAPI)

- **Install:** `cd booking_system_backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- **Run:** `.venv/bin/python server.py` (listens on `:8001`)
- **Test:** `cd booking_system_backend && pytest` (must run from this directory)
- **Single test:** `cd booking_system_backend && pytest tests/test_services.py::test_name -v`

### Java Hold Service (Spring Boot / Maven)

- **Build & run:** `cd booking_system_inventory_hold_service && mvn spring-boot:run` (requires Java 17 or 21 + Maven)
- **Test (Spring):** `cd booking_system_inventory_hold_service && mvn test`
- **Config:** `PYTHON_BACKEND_URL` env var overrides the Python backend address (default `http://localhost:8001`)

### Frontend (React / Vite)

- **Install:** `cd booking_system_frontend && npm install`
- **Dev:** `cd booking_system_frontend && npm run dev` (listens on `:5173`)
- **Build:** `cd booking_system_frontend && npm run build`
- **Lint:** `cd booking_system_frontend && npm run lint`

### Full stack

- **Start all locally:** `./start.sh` (wraps `scripts/local/start_locally.sh`)
- **Docker Compose (backend + frontend):** `docker compose up`
- **Docker Compose (+ Java hold service):** `docker compose --profile hold-service up`
- **E2E tests:** `cd e2e && ./run.sh` (builds full stack in Docker, waits for health, runs pytest)
  - `E2E_BASE_URL=http://host:port` — skip compose, run against existing stack
  - `E2E_KEEP_STACK=1` — leave stack up after tests (for debugging)
  - `E2E_RUN_SLOW=1` — include the ~90 s auto-expiry test

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
  seed.py                          Demo data seeding (disabled in tests)
  tests/                           pytest suite; in-memory SQLite, StaticPool

booking_system_inventory_hold_service/   Java 17 / Spring Boot 3 — quote & hold lifecycle
  src/main/java/com/galaxium/holdservice/
    api/           REST controllers (Quote, Hold, Health)
    domain/        JPA entities (Quote, Hold, AuditEvent)
    repository/    Spring Data repositories
    service/       Business logic (QuoteService, HoldService, PricingService)
    scheduler/     HoldExpirationScheduler (runs every 60 s, expires stale holds)
    client/        PythonBackendClient (RestTemplate → /internal/bookings/from-hold)
  application.properties  hold.duration.minutes=15; port=8080

booking_system_frontend/         React 19 + TypeScript + Vite + Tailwind
  src/
    pages/           Route-level components
    components/      Reusable UI pieces
    services/        API calls (api.ts) — check success:false, not HTTP status
    types/           Shared TypeScript types
    hooks/           Custom React hooks

e2e/                             pytest end-to-end suite (Docker Compose)
  docker-compose.e2e.yml         Runs backend + Java service + postgres on non-clashing ports
  test_smoke.py                  Basic backend health and booking flow
  test_holds.py                  Full quote→hold→confirm→booking cross-service flow

scripts/
  aws/             ECS/ALB deploy + scale/teardown scripts
  ibm/             IBM Code Engine deploy + teardown scripts
  terraform/       Terraform HCL for AWS (VPC, ECS, ALB, ECR, IAM, CloudWatch)
  local/           start_locally.sh + test-containers.sh
```

**Request flow (holds):** Frontend → `POST /quotes` (Python proxy) → Java `/api/v1/quotes` → Java `POST /api/v1/quotes/{id}/holds` → Python `POST /quotes/{id}/holds` proxy → on confirm: Java calls Python `/internal/bookings/from-hold` to create the real booking.

## Conventions

- **Backend:** snake_case for functions/variables; PascalCase for classes/Pydantic models.
- **Frontend API errors:** always inspect the `success` field or look for `error` in the body — HTTP status is not reliable for error detection (see [`api.ts`](booking_system_frontend/src/services/api.ts:112)).
- **Custom Tailwind tokens:** space-themed palette defined in [`tailwind.config.js`](booking_system_frontend/tailwind.config.js) — do not assume standard Tailwind color names.
- **Java:** Lombok `@Data`/`@Builder`/`@RequiredArgsConstructor` used throughout; no manual getters/setters. Service methods are `@Transactional`.
- **New backend endpoints:** add REST handler + matching MCP tool if agent-accessible, following the pattern in `server.py`.

## Workflow

- Branch naming: no enforced convention observed; recent branches use `restore/`, `feature/` prefixes.
- Before a PR: run `cd booking_system_backend && pytest` (all must pass).
- E2E tests require Docker; run with `cd e2e && ./run.sh` before merging hold-service changes.
## Notes for the agent

- `booking_system_inventory_hold_service/target/` is Maven output — never edit files inside it.
- `booking_system_frontend/dist/` is Vite build output — never edit; regenerate with `npm run build`.
- The `scripts/terraform/.terraform/` directory contains provider binaries — do not touch.
- When adding a new Python service function, add both a REST endpoint and an MCP tool (see the pattern in `server.py`).
- When modifying the Java service's hold duration or expiry interval, update `application.properties` and the e2e `test_holds.py` timeout accordingly.
