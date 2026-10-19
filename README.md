# Galaxium Travels — Interplanetary Booking System

A demo multi-service application for booking interplanetary space travel. Its purpose is to **showcase challenges agents face in a real enterprise-style codebase** — three polyglot services, cross-service workflows, a dual REST + MCP backend, and intentional architectural constraints that make it interesting to work with.

## 🌟 Features

- 🚀 **Book flights across the solar system** — search routes between Earth, Mars, the Moon, Venus, Jupiter, Europa, and Pluto
- 💺 **Three seat classes** — Economy, Business, and Galaxium, each with independent seat counters and their own pricing multipliers
- ⏳ **Quote & hold workflow** — reserve a seat with a time-limited hold before committing to a booking, powered by a dedicated Java microservice
- 🤖 **Dual REST + MCP backend** — every booking operation is accessible as a standard REST endpoint *and* as an MCP tool, so AI agents can interact with the system natively
- 📡 **Live seat availability** — sold-out classes don't block other classes; availability updates in real time as bookings and holds are created or cancelled
- 🗓️ **Full booking lifecycle** — create, view, and cancel bookings; holds auto-expire after 15 minutes if not confirmed
- 🌍 **10 demo travellers, 10 routes, 20 pre-seeded bookings** — ready to explore the moment you start the app
- ☁️ **Deployable everywhere** — one-command local start, Docker Compose, AWS ECS + Terraform, and IBM Code Engine

## Architecture

```
galaxium-travels/
├── booking_system_backend/              Python 3 / FastAPI + FastMCP
│   ├── server.py                          REST API, MCP tools, Java proxy endpoints
│   ├── services/{booking,flight,user}.py  Business logic
│   ├── models.py                          SQLAlchemy ORM models
│   ├── schemas.py                         Pydantic request/response schemas
│   ├── db.py                              Engine, SessionLocal, get_db()
│   ├── seed.py                            Demo data seeding
│   └── tests/                             pytest suite (in-memory SQLite, StaticPool)
│
├── booking_system_inventory_hold_service/ Java 17 / Spring Boot 3.4
│   └── src/main/java/com/galaxium/holdservice/
│       ├── api/           REST controllers (Quote, Hold, Health)
│       ├── domain/        JPA entities (Quote, Hold, AuditEvent)
│       ├── service/       Business logic (QuoteService, HoldService, PricingService)
│       ├── scheduler/     HoldExpirationScheduler (runs every 60 s)
│       └── client/        PythonBackendClient → /internal/bookings/from-hold
│
├── booking_system_frontend/             React 19 / TypeScript / Vite / Tailwind
│   └── src/
│       ├── pages/           Flights, Home, MyBookings
│       ├── components/      Reusable UI components
│       ├── services/        API calls (api.ts)
│       ├── hooks/           Custom React hooks
│       └── types/           Shared TypeScript types
│
├── e2e/                                 Black-box pytest suite
│   ├── docker-compose.e2e.yml           Isolated stack (ports 18001/18082, SQLite)
│   ├── run.sh / run-native.sh           Docker and native runners
│   ├── test_smoke.py                    Health, flights, booking happy/sad paths
│   └── test_holds.py                    Full quote → hold → confirm cross-service flow
│
├── scripts/
│   ├── aws/         ECS/ALB deploy, scale, teardown
│   ├── ibm/         IBM Code Engine deploy, status, teardown
│   ├── local/       start_locally.sh, test-containers.sh
│   └── terraform/   Terraform HCL — VPC, ECS, ALB, ECR, IAM, CloudWatch, RDS
│
├── docker-compose.yml                   Backend + frontend + optional Java hold service
├── start.sh                             Local dev quick-start wrapper
├── test.sh                              E2E test suite wrapper
├── reset.sh                             Post-demo cleanup
└── AGENTS.md                            Critical patterns for AI agents
```

### Request flow (quote → hold → booking)

```
Frontend → POST /quotes        (Python proxy)
         → Java POST /api/v1/quotes
         → Java POST /api/v1/quotes/{id}/holds
         → (on confirm) Java POST Python /internal/bookings/from-hold
         → real booking created in Python DB
```

## Quick start

**Prerequisites:** Python 3.10+, Node.js 20.19+ or 22.12+. For the Java hold service: Java 17 or 21 and Maven. For Docker Compose: see the [Docker on macOS notes](#docker-on-macos) below.

### Option 1 — One command (recommended for local dev)

```bash
./start.sh
```

Starts the Python backend (port **8001**), the Java hold service (port **8080**, if Maven and Java 17/21 are available), and the Vite frontend (port **5173**). Press `Ctrl+C` to stop everything.

### Option 2 — Manual

```bash
# Backend
cd booking_system_backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server.py                    # listens on :8001

# Frontend (new terminal)
cd booking_system_frontend
npm install
npm run dev                         # listens on :5173

# Java hold service (new terminal, optional)
cd booking_system_inventory_hold_service
mvn spring-boot:run                 # listens on :8080
```

### Option 3 — Docker Compose

```bash
# Backend + frontend only
docker compose up

# Include Java hold service
docker compose --profile hold-service up
```

The backend container uses **PostgreSQL** (port 5433 on the host) when running via Docker Compose.

#### Docker on macOS

[Colima](https://github.com/abiosoft/colima) is the recommended runtime. One-time setup:

```bash
brew install colima docker docker-compose docker-buildx
colima start
```

Add to `~/.docker/config.json` so `docker compose` and `docker buildx` work:
```jsonc
{ "cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"] }
```

If `docker ps` errors, run `docker context use colima`.

## Service endpoints

| Service | Local | Docker |
|---|---|---|
| Frontend | http://localhost:5173 | http://localhost:5173 |
| Backend REST | http://localhost:8001 | http://localhost:8001 |
| Swagger UI | http://localhost:8001/docs | http://localhost:8001/docs |
| MCP endpoint | http://localhost:8001/mcp | http://localhost:8001/mcp |
| Java hold service | http://localhost:8080 | http://localhost:8082 |

## Key architectural notes

- **MCP server must be created before FastAPI app** — `server.py` instantiates `FastMCP` before `FastAPI` to allow correct lifespan composition. Swapping the order breaks the app.
- **MCP tools bypass FastAPI DI** — they call `SessionLocal()` and `db.close()` directly; they do not use `Depends(get_db)`.
- **Service functions return Union types** — `booking.py` returns `BookingOut | ErrorResponse`. Callers check `isinstance(result, ErrorResponse)`.
- **`book_flight()` validates both `user_id` AND `name`** — intentional non-standard security pattern; name mismatch rejects the booking.
- **SQLite is the default database** — `DATABASE_URL` env var controls this; unset = SQLite (`./booking.db`). Docker Compose sets it to PostgreSQL.
- **`SEED_DEMO_DATA=true` re-seeds on every start** (only if the DB is empty). Set to `false` to preserve data across restarts.
- **Java proxy swallows 404s** — proxy endpoints return `{"error": "..."}` with HTTP 200. Check the body, not just the status code.
- **`holds.db` and `booking.db` are committed** — they seed local dev; regenerated on startup.

## Demo data

Seeded automatically on first start:

| Entity | Count | Detail |
|---|---|---|
| Users | 10 | Alice, Bob, Charlie, Diana, Eve, Frank, Grace, Heidi, Ivan, Judy |
| Flights | 10 | Routes: Earth ↔ Mars/Moon/Venus/Jupiter/Europa/Pluto |
| Bookings | 20 | Distributed across economy/business/galaxium, various statuses |

## Seat classes & pricing

| Class | Multiplier | Seat allocation |
|---|---|---|
| Economy | 1.0× | 60% |
| Business | 2.5× | 30% |
| Galaxium | 5.0× | 10% |

Each class has independent seat counters. A sold-out class doesn't block bookings in other classes.

## Multi-leg itineraries

- `GET /itineraries/search` — Search for multi-leg flight routes between origin and destination with layover constraints.
- `POST /itineraries` — Create a new provisional multi-leg itinerary reservation.
- `POST /itineraries/{itinerary_id}/confirm` — Confirm and book all legs in a provisional itinerary.
- `GET /users/{user_id}/itineraries` — Retrieve all multi-leg itineraries for a specific user.

## MCP tools (AI agent API)

The backend exposes six tools at `/mcp`:

| Tool | Description |
|---|---|
| `list_flights` | List all available flights |
| `book_flight` | Book a seat (user_id, name, flight_id, seat_class) |
| `get_bookings` | Get all bookings for a user |
| `cancel_booking` | Cancel a booking by ID |
| `register_user` | Register a new user |
| `get_user_id` | Look up a user by name + email |

## Testing

### Backend unit tests

```bash
cd booking_system_backend
pytest                           # all tests
pytest -v                        # verbose
pytest tests/test_services.py    # service layer only
pytest tests/test_rest.py        # REST endpoints only
```

Tests use an in-memory SQLite database with `StaticPool`. `SessionLocal` is patched in **both** `db` and `server` modules — patching only one leaves MCP tools hitting the real DB.

### Frontend

```bash
cd booking_system_frontend
npm run build    # TypeScript compile + Vite build
npm run lint     # ESLint
```

### End-to-end tests

```bash
# Native (recommended) — starts backend + Java jar directly, no Docker
cd e2e && ./run-native.sh
E2E_RUN_SLOW=1 ./run-native.sh        # include the ~90 s hold auto-expiry test

# Against an already-running stack
E2E_BASE_URL=http://localhost:8001 ./run-native.sh
```

Requires the backend venv (`booking_system_backend/.venv`) and a built Java jar (`booking_system_inventory_hold_service/target/inventory-hold-service-1.0.0.jar`, built with Java 17).

`./test.sh` (wraps `e2e/run.sh`) is an alternative — it runs pytest directly, and if `E2E_BASE_URL` is unset it falls back to bringing up the Docker Compose stack in `e2e/docker-compose.e2e.yml`.

Hold duration is shortened to 1 minute in both runners so auto-expiry is testable without a 15-minute wait.

**Coverage:**
- `test_smoke.py` — health, flight listing, booking happy path, name-mismatch rejection
- `test_holds.py` — quote → hold → confirm creates a real booking; release; idempotent confirm; unknown quote; auto-expiry

### Java hold service tests

```bash
cd booking_system_inventory_hold_service
mvn test
```

## Deployment

### AWS (ECS + ALB + Terraform)

```bash
./scripts/aws/deploy-to-aws.sh     # deploy
./scripts/aws/scale-to-zero.sh     # pause (cost saving)
./scripts/aws/scale-up.sh          # resume
./scripts/aws/teardown-aws.sh      # destroy
```

Terraform HCL lives in `scripts/terraform/`. Infrastructure: VPC, ECS, ALB, ECR, IAM, CloudWatch, RDS.

### IBM Cloud (Code Engine)

```bash
./scripts/ibm/deploy-to-ibm.sh     # deploy all services
./scripts/ibm/check-ibm-status.sh  # check status
./scripts/ibm/teardown-ibm.sh      # tear down
```

## Reset demo environment

After a demo, reset to a clean state:

```bash
./reset.sh          # interactive (prompts before each step)
./reset.sh --force  # non-interactive
```

Removes demo branches, database files, and build artifacts. See `DEMO_RUNBOOK.md` for the full demo guide.

## Technology stack

| Layer | Technology |
|---|---|
| Backend | Python 3, FastAPI, FastMCP, SQLAlchemy, Pydantic, Uvicorn |
| Database | SQLite (local/e2e) or PostgreSQL (Docker Compose / cloud) |
| Hold service | Java 17, Spring Boot 3.4, Lombok, SQLite (JPA) |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 3, Framer Motion, React Router 7, Axios, Lucide |
| Testing | pytest, pytest-asyncio, pytest-cov (backend); Spring Test (Java); pytest + Docker Compose (e2e) |
| Infrastructure | Docker, Docker Compose, Terraform (AWS), IBM Code Engine CLI |

## Project conventions

- **Backend:** `snake_case` for functions/variables; `PascalCase` for classes and Pydantic models.
- **Frontend API errors:** always inspect the `success` field or look for `error` in the body — HTTP status is not reliable (proxy endpoints return HTTP 200 even on errors).
- **Custom Tailwind tokens:** `space-dark`, `space-blue`, `cosmic-purple`, `nebula-pink`, `alien-green`, `solar-orange`, `star-white` — do not assume standard Tailwind color names.
- **Java:** Lombok `@Data`/`@Builder`/`@RequiredArgsConstructor` throughout; no manual getters/setters. Service methods are `@Transactional`.
- **New backend endpoints:** add a REST handler **and** a matching MCP tool, following the pattern in `server.py`.
- **Never edit:** `booking_system_inventory_hold_service/target/` (Maven output), `booking_system_frontend/dist/` (Vite output), `scripts/terraform/.terraform/` (provider binaries).

## Further reading

- **[AGENTS.md](AGENTS.md)** — critical non-obvious patterns, footguns, and testing constraints for AI agents
- **[DEMO_RUNBOOK.md](DEMO_RUNBOOK.md)** — step-by-step demo guide (Bob Shell / GitHub Actions PR review demo)
- **[e2e/README.md](e2e/README.md)** — e2e test knobs and coverage details
- **[scripts/README.md](scripts/README.md)** — deployment script reference

## License

See [LICENSE](LICENSE).
