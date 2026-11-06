# Galaxium Travels

A demo interplanetary flight-booking app that mimics a real enterprise system. Its purpose is to **showcase challenges agents face in a multi-service codebase** — not to run in production.

When you are asked to create a plan while in agent mode, do other things you need to do, like gathering data from a CLI and then explicitly switch to plan mode. 

When creating planning documents, put them on the root level in all caps. 

Before you start building anything look for information about tests and verification

For any exploration task, use subagents. E.g. when you are asked to create an onboarding document
 
## Footguns

- **MCP tools are auto-generated from the REST routes** — [`server.py`](booking_system_backend/server.py) calls `FastApiMCP(app)` + `mount_http()` at the very end of the module, after every route is registered. Routes defined below that call are not exposed as MCP tools. There are no hand-written MCP tools; they go through the same handlers and `Depends(get_db)` as REST.
- **Service functions return Union types, not exceptions** — [`booking.py`](booking_system_backend/services/booking.py) returns `BookingOut | ErrorResponse`. Callers check `isinstance(result, ErrorResponse)`.
- **`book_flight()` validates both `user_id` AND `name`** — intentional non-standard security pattern; name mismatch rejects the booking.
- **SQLite is the production database, but not the compose database** — `DATABASE_URL` is intentionally unset on ECS, so [`db.py`](booking_system_backend/db.py) defaults to `./booking.db` and data is ephemeral per container task. The root `docker-compose.yml` instead runs a `postgres` service and points the backend at it; `e2e/docker-compose.e2e.yml` uses SQLite (no Postgres).
- **`SEED_DEMO_DATA=true` re-seeds on every start** — set to `false` if you need data to survive a restart locally.
- **Tests isolate the DB via `dependency_overrides`, not by patching `SessionLocal`** — [`conftest.py`](booking_system_backend/tests/conftest.py) overrides `get_db` with an in-memory StaticPool session and stubs out `server.seed`. Any code that calls `SessionLocal()` directly instead of using `Depends(get_db)` will bypass this and hit `./booking.db`.
- **Java hold service requires Java 17 or 21** — Lombok does not support Java 22+. The start script auto-detects sdkman candidates; set `JAVA_HOME` manually if needed.
- **`docker-compose.yml` Java service is behind a profile** — it uses `profiles: [hold-service]`. Run `docker compose --profile hold-service up` to include it, or use `e2e/docker-compose.e2e.yml` which enables it unconditionally.
- **Python proxy swallows Java 404s** — proxy endpoints in `server.py` catch `httpx.HTTPError` and return `{"error": "..."}` with HTTP 200. Callers must check the response body, not just the status code (see `test_hold_on_unknown_quote_returns_error` in [`test_holds.py`](e2e/test_holds.py:81)).
- **`holds.db` and `booking.db` are local, gitignored artefacts** — they are not tracked; they are (re)created on startup via `spring.jpa.hibernate.ddl-auto=update` and `SEED_DEMO_DATA=true`. Deleting them just resets local data.
- **Automated checks run after every edit, via lifecycle hooks** — see [`.bob/settings.json`](.bob/settings.json). Editing a backend `.py` file runs mypy (new errors only) + pytest; a frontend `.ts`/`.tsx` file runs `tsc -b` + eslint; a hold-service `.java` file runs `mvn test-compile`. If a check fails, your **next tool call is blocked once** with the report — fix it (or carry on if you are mid-change), then retry. Committing is blocked while the backend or Java unit suite is red. **If a tool call is reported as blocked, read `.bob/hooks/state/.last-block` for the reason** — the hook writes the full explanation there.

## Prerequisites

Docker is required for the full stack and e2e tests. On macOS, [Colima](https://github.com/abiosoft/colima) is the recommended Docker runtime:

```bash
# docker-buildx is NOT optional: without it, "docker compose --build" falls back
# to the legacy builder, which on macOS triggers a Keychain prompt and fails with
# "error getting credentials ... (-128)". It also forces slow amd64 emulation.
brew install colima docker docker-compose docker-buildx
colima start
```

Homebrew installs the compose and buildx plugins under `/opt/homebrew/lib/docker/cli-plugins`, but the Docker CLI doesn't look there by default. Point it there once (per Homebrew's own caveats) so both `docker compose` and `docker buildx` work:

```jsonc
// ~/.docker/config.json
{
  "cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"]
}
```

Verify before running any compose or e2e commands:

```bash
docker ps           # should return an empty table, not an error
docker buildx version   # should print a version, not "unknown command"
```

If `docker ps` errors with "cannot connect to the Docker daemon", `colima start` didn't activate its context — run `docker context use colima` (or `export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"`).

## Commands

### Backend (Python / FastAPI)

- **Install:** `cd booking_system_backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- **Run:** `.venv/bin/python server.py` (listens on `:8001`)

### Java Hold Service (Spring Boot / Maven)

- **Build & run:** `cd booking_system_inventory_hold_service && mvn spring-boot:run` (requires Java 17 or 21 + Maven)
- **Config:** `PYTHON_BACKEND_URL` env var overrides the Python backend address (default `http://localhost:8001`)

### Frontend (React / Vite)

- **Install:** `cd booking_system_frontend && npm install`
- **Dev:** `cd booking_system_frontend && npm run dev` (listens on `:5173`)
- **Build:** `cd booking_system_frontend && npm run build`

### Full stack

- **Start all locally:** `./start.sh` (wraps `scripts/local/start_locally.sh`)
- **Docker Compose (backend + frontend):** `docker compose up`
- **Docker Compose (+ Java hold service):** `docker compose --profile hold-service up`

### Deploy

- **AWS:** `./scripts/aws/deploy-to-aws.sh`
- **IBM Cloud:** `./scripts/ibm/deploy-to-ibm.sh`

## Architecture

```
booking_system_backend/          Python/FastAPI service — REST API, MCP server, SQLite
  server.py                        Entry point; REST endpoints + Java proxy; MCP auto-mounted via fastapi-mcp
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
  docker-compose.e2e.yml         Runs backend + Java service (SQLite, no Postgres) on non-clashing ports; short hold duration via env
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
- **New backend endpoints:** add a REST handler in `server.py` above the `FastApiMCP(app)` call; fastapi-mcp exposes it as an MCP tool automatically.

## Workflow

- Branch naming: no enforced convention observed; recent branches use `restore/`, `feature/` prefixes.
- **Verification:** use the `verify` skill — it knows which checks are cheap vs. expensive and when e2e is needed.

## Issue agent (GitHub Actions)

[`bob-issue-agent.yml`](.github/workflows/bob-issue-agent.yml) runs the **Galaxium Bob Agent** headless:
- It triages new issues from collaborators, or any issue a maintainer labels `agent:triage`.
- It asks clarifying questions in the comments.
- It implements simple issues as a PR from the machine user `galaxium-bob-agent`.

Its behaviour lives in the `issue-triager` / `issue-implementer` modes and the `issue-triage` / `issue-implement` skills. Design: [`AUTONOMOUS_ISSUE_AGENT_PLAN.md`](AUTONOMOUS_ISSUE_AGENT_PLAN.md).

- **Issue and comment events run `main`'s copy of the workflow.** Changes to `bob-issue-agent.yml` take effect only after merge. Use `workflow_dispatch` (with an issue number) to rerun one issue.
- **Kill switch:** the repository variable `BOB_AGENT_ENABLED` must be `true`. Set it to `false` to stop the agent without a code change.
- **The agent never reacts to itself.** The `gate` job skips any event sent by `galaxium-bob-agent` or a `[bot]`. Its own label and comment events show up as skipped runs, and that is expected.
- **State is in `agent:*` labels:** `triage`, `needs-info`, `needs-human`, `ready`, `in-progress`, `pr-open`. Each triage run clears the old ones first.
- **`deny-agent-commands.sh` only acts when `GITHUB_ACTIONS=true`.** It blocks merging, force-pushing, pushing to `main` and reading secrets. Local sessions are unaffected.
- **Headless runs:** the plan-mode, subagent and ALL-CAPS-planning-doc instructions at the top of this file are for interactive sessions. The issue agent's modes don't have those tools.

## Notes for the agent

- `booking_system_inventory_hold_service/target/` is Maven output — never edit files inside it.
- `booking_system_frontend/dist/` is Vite build output — never edit; regenerate with `npm run build`.
- The `scripts/terraform/.terraform/` directory contains provider binaries — do not touch.
- When adding a new Python service function, expose it via a REST endpoint in `server.py` (above `FastApiMCP(app)`); the MCP tool is generated from it.
- When modifying the Java service's hold duration or expiry interval, update `application.properties`. The e2e suite overrides both via `HOLD_DURATION_MINUTES` / `HOLD_EXPIRATION_CHECK_INTERVAL_SECONDS` in `e2e/docker-compose.e2e.yml`; if you change those, check the `test_hold_auto_expiry` timeout in `test_holds.py`.
