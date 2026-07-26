# Technical Debt Assessment — Galaxium Travels

*Scope: `booking_system_backend/` · `booking_system_frontend/` · `booking_system_inventory_hold_service/` · `docker-compose.yml` (absent) · `AGENTS.md`*
*Infrastructure context: `start.sh` · `booking_system_backend/Dockerfile` · no CI/CD pipeline*

> **`docker-compose.yml` does not exist.** The file was referenced in the task but is not present in the repository. The absence itself is recorded as a debt item in Operational Readiness.

---

## 1. Architecture Debt

---

### AD-01 · [CRITICAL] · [MONTHS] — Inventory Hold Service is a declared-but-unbuilt architectural component

**Affected files/components:** `booking_system_inventory_hold_service/pom.xml`, `booking_system_backend/services/booking.py:19,44`

**Description:**
The `pom.xml` describes the service as: *"Reserves seats on a flight for a configurable TTL window so that the booking service can complete payment without a race condition on `seats_available`."* No Java source files exist. The `src/main/java/` tree is entirely absent. The race condition the service was designed to eliminate — an unguarded read-check-write on `seats_available` across two separate statements with no DB-level lock — exists in the live Python backend today. The architectural decision to extract seat-holding into a dedicated microservice has been recorded but not executed, leaving the core booking reliability problem unaddressed.

**Consequence of leaving unaddressed:**
Concurrent booking requests can overbook flights. `seats_available` can go negative with no DB-level constraint preventing it. The microservice boundary documented in the architecture will never be reached: all operational complexity of a multi-service system is implicit in the design but none of the reliability benefits are realised.

---

### AD-02 · [CRITICAL] · [WEEKS] — No authentication or authorisation layer exists anywhere in the system

**Affected files/components:** `booking_system_backend/server.py:133–178` (all endpoints), `booking_system_backend/services/user.py:25`, `booking_system_frontend/src/components/user/UserIdentification.tsx:44–58`

**Description:**
All REST endpoints and all MCP tools are publicly accessible with no credential verification. The application's notion of "sign in" is a name+email lookup that returns a `user_id` — possession of another user's name and email is sufficient to retrieve their `user_id`, view their booking history, and cancel their bookings. There is no token, session cookie, API key, JWT, or any other secret exchanged at any point. `AGENTS.md` documents this explicitly: *"No authentication layer — 'login' is name+email lookup only."*

**Consequence of leaving unaddressed:**
The application cannot be safely exposed to the internet. Any actor can enumerate users and cancel bookings on their behalf. Any real booking or payment integration built on top of this system would inherit a completely open API surface.

---

### AD-03 · [HIGH] · [MONTHS] — Monolith-to-microservice split is partially committed to but architecturally inconsistent

**Affected files/components:** `booking_system_backend/server.py`, `booking_system_inventory_hold_service/pom.xml`, `AGENTS.md`

**Description:**
The repository contains two backend runtimes in different languages (Python/FastAPI, Java/Spring Boot) with no integration contract between them — no shared API specification, no service discovery, no message broker, and no HTTP client in the Python backend that calls the Java service. The Python backend is a self-contained monolith (REST + MCP + DB in a single process). The Java service is a scaffold. The system is simultaneously over-engineered (has a second runtime declared) and under-engineered (the Python backend does everything including the seat-hold logic the Java service was meant to own). The `AGENTS.md` documents only two sub-projects, with no mention of the Java service.

**Consequence of leaving unaddressed:**
New engineers encounter an architectural intent that does not match the implementation. Any effort to actually split the seat-hold logic into the Java service must also introduce inter-service communication, shared auth, distributed transaction handling, and network failure modes — none of which have been designed.

---

### AD-04 · [HIGH] · [WEEKS] — SQLite is the sole database with no migration system and data wiped on every restart

**Affected files/components:** `booking_system_backend/db.py:5`, `booking_system_backend/seed.py:9–13`, `booking_system_backend/server.py:110`, `AGENTS.md`

**Description:**
The database is a file-based SQLite instance (`booking.db`) created at `./booking.db` inside the container filesystem. `seed()` is called unconditionally in the FastAPI lifespan and deletes all rows from all tables before re-inserting demo data. Schema is managed entirely by `Base.metadata.create_all()` — there is no Alembic or any migration system. `AGENTS.md` explicitly states: *"No migrations — schema changes require editing `models.py`; `create_all` runs on startup."*

**Consequence of leaving unaddressed:**
A container restart destroys all user data and bookings. Any schema change (e.g. adding a column) requires a full data wipe. The system cannot accumulate real data. Horizontal scaling is impossible — two backend instances would each have their own SQLite file with no shared state.

---

### AD-05 · [HIGH] · [DAYS] — Dual-protocol server (REST + MCP) creates two inconsistent validation surfaces

**Affected files/components:** `booking_system_backend/server.py:73` (MCP `register_user`), `booking_system_backend/schemas.py:35–37` (REST `UserRegistration`)

**Description:**
REST endpoints validate input through Pydantic schemas (e.g. `UserRegistration.email: EmailStr` enforces RFC 5322 format). MCP tools accept plain Python primitives (`name: str, email: str`) with no validation. The same `services/user.register_user()` function is called by both paths, but only the REST path has a validated entry point. An MCP caller can register a user with `email="notanemail"` or `name=""`.

**Consequence of leaving unaddressed:**
The database accumulates malformed records reachable only through the MCP path. Inconsistent validation between two protocols serving the same business logic is a permanent source of subtle bugs and makes the service contract unprovable by testing either path in isolation.

---

### AD-06 · [MEDIUM] · [WEEKS] — All REST mutations use HTTP POST; no semantic HTTP method usage

**Affected files/components:** `booking_system_backend/server.py:160` (`POST /cancel/{booking_id}`), `AGENTS.md`

**Description:**
Cancellation — a state change on an existing resource — uses `POST /cancel/{booking_id}` rather than `DELETE /bookings/{booking_id}` or `PATCH /bookings/{booking_id}`. This is documented in `AGENTS.md` as intentional. All mutation endpoints are POST. While technically functional, this diverges from REST semantics and means HTTP-level tooling (caches, API gateways, monitoring) cannot distinguish read from write operations by method alone.

**Consequence of leaving unaddressed:**
HTTP intermediaries (CDNs, reverse proxies) may cache POST responses incorrectly, or fail to invalidate related caches. Future API consumers must read documentation rather than inferring operation type from the HTTP verb. The MCP tool compatibility note in `AGENTS.md` suggests the non-standard method was chosen for MCP reasons, making it harder to fix without breaking the MCP surface.

---

### AD-07 · [MEDIUM] · [WEEKS] — No inter-service contract or API specification

**Affected files/components:** `booking_system_backend/`, `booking_system_inventory_hold_service/`, repository root

**Description:**
No OpenAPI spec, AsyncAPI document, or any machine-readable contract exists outside what FastAPI auto-generates at `/docs`. The Java service has no API surface at all. There is no shared schema repository, no Protobuf/Avro/JSON Schema definition, and no contract testing. The frontend consumes the backend through TypeScript interfaces in `src/types/index.ts` that are manually maintained mirrors of the Pydantic schemas — there is no code generation from a shared spec.

**Consequence of leaving unaddressed:**
The TypeScript frontend types and the Python backend schemas can drift silently. Adding the Java service requires agreeing on an API contract with no tooling to enforce it. Breaking changes in the backend are not caught until runtime.

---

## 2. Security Debt

---

### SD-01 · [CRITICAL] · [MONTHS] — User identity is name+email with no secret; credentials transmitted as URL query parameters

**Affected files/components:** `booking_system_backend/server.py:176`, `booking_system_backend/services/user.py:25`, `booking_system_frontend/src/components/user/UserIdentification.tsx`

**Description:**
`GET /user?name=Alice&email=alice@example.com` is the authentication mechanism. The email address appears as a plain-text query parameter in the URL, which means it is recorded in: server access logs, browser history, proxy logs, Nginx/load-balancer access logs, and any monitoring system that captures full URLs. The service treats knowledge of name and email as proof of identity — there is no password, no token, no TOTP, and no session secret. The frontend stores the returned `user_id`, `name`, and `email` in `localStorage` as unsigned, unexpired JSON.

**Consequence of leaving unaddressed:**
Any log file exposure leaks all user credentials. The authentication model provides zero protection against an attacker who has read access to any server or proxy log. The `localStorage` session can be tampered with via browser DevTools or XSS to impersonate any user.

---

### SD-02 · [CRITICAL] · [WEEKS] — CORS wildcard with `allow_credentials=True` is a misconfiguration

**Affected files/components:** `booking_system_backend/server.py:124–130`

**Description:**
`CORSMiddleware` is configured with `allow_origins=["*"]` and `allow_credentials=True`. The CORS specification prohibits credentialed requests to wildcard origins — browsers refuse to complete such requests. This means the configuration simultaneously fails to enable the intended credential behaviour and signals that no thought has been given to which origins should be trusted. Any future addition of cookie-based sessions or tokens would require the CORS policy to be corrected first.

**Consequence of leaving unaddressed:**
The credential-sending behaviour the configuration implies is silently broken in all browsers. If auth is added later, the wildcard policy would allow any origin to make credentialed requests, enabling cross-origin request forgery from any site.

---

### SD-03 · [HIGH] · [MONTHS] — No dependency vulnerability scanning across any service

**Affected files/components:** `booking_system_backend/requirements.txt`, `booking_system_frontend/package.json`, `booking_system_inventory_hold_service/pom.xml`, repository root (no `.github/`, no `.snyk`)

**Description:**
No vulnerability scanning tool is configured for any of the three dependency manifests. No `dependabot.yml`, `renovate.json`, `.snyk`, `pip-audit`, `npm audit` CI step, or OWASP Dependency-Check Maven plugin exists anywhere in the repository. No CI pipeline exists to run any of these. The Python backend has 10 completely unpinned dependencies; a vulnerability in any transitive dependency can silently enter the next install.

**Consequence of leaving unaddressed:**
Known CVEs in `fastapi`, `axios`, `spring-boot`, or any transitive package will go undetected indefinitely. The project has no signal that a dependency has a published security advisory.

---

### SD-04 · [HIGH] · [DAYS] — Swagger UI (`/docs`) and MCP endpoint (`/mcp`) are publicly exposed with no access control

**Affected files/components:** `booking_system_backend/server.py:117–122` (FastAPI app init), `booking_system_backend/server.py:183` (MCP mount)

**Description:**
FastAPI's auto-generated Swagger UI is enabled at `/docs` with no authentication guard. The MCP endpoint at `/mcp` is mounted without any authentication middleware. Both surfaces expose the full API schema and allow any caller to invoke any tool or endpoint. In a production deployment, Swagger UI is a complete API documentation and execution interface open to the public internet.

**Consequence of leaving unaddressed:**
An attacker with network access to port 8080 has a full, documented, executable interface to all backend functionality including booking and cancellation operations on any user's reservations.

---

### SD-05 · [HIGH] · [WEEKS] — No input length or content constraints on free-text fields

**Affected files/components:** `booking_system_backend/schemas.py:18–21,35–37`, `booking_system_backend/services/user.py:16`, `booking_system_backend/services/booking.py:45–50`

**Description:**
`BookingRequest.name`, `UserRegistration.name`, and the MCP equivalents accept strings of arbitrary length with no minimum, maximum, or pattern validation. An empty string `""`, a whitespace-only string `"   "`, or a multi-megabyte string are all accepted and written to the database. SQLite's `String` column imposes no length limit.

**Consequence of leaving unaddressed:**
The database can accumulate records that break display assumptions in the UI. Extremely large strings in `name` fields create a denial-of-service vector where maliciously large payloads consume storage and increase serialisation cost on every API response that includes affected records.

---

### SD-06 · [HIGH] · [WEEKS] — Docker image runs as root with no non-root user, no health check, and no `.dockerignore`

**Affected files/components:** `booking_system_backend/Dockerfile`

**Description:**
The `Dockerfile` is six lines:
```
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8080
CMD ["python", "server.py"]
```
Three distinct issues:
1. **Runs as root.** No `USER` instruction; the process runs as UID 0 inside the container.
2. **No `HEALTHCHECK`.** Container orchestrators (ECS, Kubernetes, Cloud Run) cannot detect a crashed or unresponsive process; traffic continues to be routed to unhealthy instances.
3. **No `.dockerignore`.** `COPY . .` copies `tests/`, `.venv/` (if present), `pytest.ini`, `booking.db`, and any local secrets into the image.

**Consequence of leaving unaddressed:**
A container escape vulnerability (present or future) grants root-level host access. Orchestrators route traffic to unhealthy containers. The image is larger than necessary and may contain sensitive local files or test fixtures.

---

### SD-07 · [MEDIUM] · [WEEKS] — Frontend `localStorage` session has no expiry, no integrity check, and is vulnerable to XSS takeover

**Affected files/components:** `booking_system_frontend/src/hooks/useUser.tsx:7,12–18,26`

**Description:**
The user session — `user_id`, `name`, `email` — is stored as unsigned, unexpired JSON in `localStorage` under key `galaxium_user`. The value is parsed and trusted unconditionally on page load (line 15: `return JSON.parse(stored)`). There is no expiry timestamp, no HMAC signature, no server-side session record, and no session invalidation endpoint. Any JavaScript executing in the same origin (including via XSS) can read, modify, or overwrite the session object.

**Consequence of leaving unaddressed:**
XSS on any page in the application gives an attacker full session control. Because the backend performs no server-side session validation, a tampered `user_id` in `localStorage` is accepted without challenge on the next API call.

---

### SD-08 · [MEDIUM] · [DAYS] — `seats_available` has no non-negative constraint at the DB or model level

**Affected files/components:** `booking_system_backend/models.py:20`, `booking_system_backend/services/booking.py:44`

**Description:**
`seats_available = Column(Integer, nullable=False)` has no `CheckConstraint` or application-level guard preventing the value from going below zero. The service layer checks `< 1` before decrementing, but the check and the decrement are not atomic (see AD-01). A value of `-1` or lower is storable and observable through the API.

**Consequence of leaving unaddressed:**
Negative seat counts are surfaced to the frontend and to MCP clients as valid flight data. Any business logic that treats `seats_available > 0` as "has seats" will misbehave for flights with negative counts.

---

## 3. Operational Readiness Debt

---

### OR-01 · [CRITICAL] · [MONTHS] — No CI/CD pipeline exists for any service

**Affected files/components:** Repository root (`.github/workflows/` absent)

**Description:**
No GitHub Actions workflow, no CI configuration of any kind, and no deployment pipeline exists. `AGENTS.md` and `docs/ONBOARDING.md` both explicitly note the absence. The only automated quality checks available are `pytest` (run manually), `npm run build` (run manually), and `npm run lint` (run manually). There is no automated gate on `push` or pull request for any of the three services.

**Consequence of leaving unaddressed:**
Every commit reaches the main branch without any automated validation. Breaking changes in the backend service layer, type errors in the frontend, and broken Docker builds are only discovered by a developer who manually runs the appropriate command. Deployment is entirely manual with no repeatability guarantee.

---

### OR-02 · [CRITICAL] · [DAYS] — `docker-compose.yml` does not exist; no way to run the full system as a unit

**Affected files/components:** Repository root

**Description:**
`docker-compose.yml` was referenced in this task and in `docs/ONBOARDING.md` as explicitly absent. The only multi-service launcher is `start.sh`, which is macOS/Linux-only, requires locally installed Python 3 and Node, runs both processes in the same terminal session with a 2-second fixed sleep between them, uses `pip install` (not `pip install -r` against a locked manifest) and `npm install` (not `npm ci`). There is no containerised path to run backend + frontend together.

**Consequence of leaving unaddressed:**
New contributors cannot onboard with a single command in a reproducible environment. Docker-based deployments require manual coordination of two separate images with no defined network or environment variable contract between them. The Java service cannot be added to the local stack at all.

---

### OR-03 · [CRITICAL] · [WEEKS] — Data is permanently destroyed on every server restart

**Affected files/components:** `booking_system_backend/seed.py:9–13`, `booking_system_backend/server.py:110`

**Description:**
`seed()` is called unconditionally on every startup in the FastAPI `lifespan`. It begins by executing `DELETE` on all three tables. There is no environment variable, feature flag, or config option to disable or skip the wipe. The `AGENTS.md` states: *"seed() wipes all data on startup — do not rely on seeded IDs being stable across restarts."* Any real user registration, booking, or cancellation made against the system is silently deleted the next time the process starts.

**Consequence of leaving unaddressed:**
The system cannot accumulate state. A production deployment that restarts for any reason — a deploy, a crash, a scaling event — destroys all user accounts and bookings. Any downstream system (payment processor, notification service) that holds references to booking IDs will have dangling references after every restart.

---

### OR-04 · [HIGH] · [MONTHS] — No observability: no structured logging, no metrics, no distributed tracing

**Affected files/components:** `booking_system_backend/server.py`, `booking_system_backend/services/booking.py`, `booking_system_backend/services/user.py`, `booking_system_backend/services/flight.py`

**Description:**
No `import logging` appears in any backend file. No log messages are emitted on successful operations, errors returned as `ErrorResponse`, or MCP tool invocations. The only output statement in the entire backend is `print("Database seeded with elaborate demo data!")` in `seed.py:59`. No metrics endpoint (Prometheus, StatsD), no distributed tracing (OpenTelemetry), and no structured log format exists. The frontend uses `console.error` in two catch blocks and is absent in all others.

**Consequence of leaving unaddressed:**
In production, diagnosing a booking failure, detecting an overbooking incident, tracking error rates, or determining whether the MCP surface is being abused is impossible without application-level instrumentation. The only observable signal is the Uvicorn access log.

---

### OR-05 · [HIGH] · [WEEKS] — `start.sh` is the only documented multi-service launcher and is macOS/Linux-only

**Affected files/components:** `start.sh`

**Description:**
`start.sh` is the sole documented way to run both services simultaneously. It has several operational gaps:
- Uses `source .venv/bin/activate` — bash-only, not portable to `sh`, `fish`, or Windows PowerShell.
- Runs `pip install -q -r requirements.txt` on every start, resolving fresh versions on each launch.
- Runs `npm install` (not `npm ci`) on first launch, ignoring the lock file semantics.
- Uses a fixed `sleep 2` to wait for the backend to be ready rather than health-checking.
- Kills both processes by PID on `SIGINT`/`SIGTERM` — if either process forks child processes, those are not caught.
- No Windows equivalent exists anywhere in the repository.

**Consequence of leaving unaddressed:**
Windows developers cannot use the launcher. The `pip install` on every start means each launch can resolve different dependency versions than the previous one. The fixed sleep is a reliability hazard — if the backend takes longer than 2 seconds to start, the frontend starts before the API is available.

---

### OR-06 · [HIGH] · [WEEKS] — Python backend `requirements.txt` is entirely unpinned with no lock file

**Affected files/components:** `booking_system_backend/requirements.txt`, `booking_system_backend/Dockerfile`

**Description:**
All 10 Python packages have no version specifier. `pip install -r requirements.txt` resolves the latest available version of every package at install time. The Docker image build (`RUN pip install --no-cache-dir -r requirements.txt`) does the same. Two image builds on different days may produce images with different installed versions. There is no equivalent to `package-lock.json` for the Python backend.

**Consequence of leaving unaddressed:**
Production builds are non-reproducible. A breaking release of `fastapi`, `sqlalchemy`, or `pydantic` enters the production image automatically on the next build. There is no way to reproduce a known-good build after a regression.

---

### OR-07 · [HIGH] · [WEEKS] — Test and production dependencies are co-mingled; test framework installed in production container

**Affected files/components:** `booking_system_backend/requirements.txt`, `booking_system_backend/Dockerfile:4`

**Description:**
`pytest`, `pytest-asyncio`, `pytest-cov`, and `httpx` are listed in the same `requirements.txt` as `fastapi`, `uvicorn`, and `sqlalchemy`. The Dockerfile runs `pip install -r requirements.txt`, so the production container image includes the full test framework. There is no `requirements-dev.txt` or `requirements-test.txt`.

**Consequence of leaving unaddressed:**
The production image is larger than necessary. The test framework's transitive dependencies (and their CVE exposure) are present in production. Any vulnerability in `pytest` or its plugins applies to the running container.

---

### OR-08 · [MEDIUM] · [WEEKS] — No frontend Dockerfile; frontend is not containerisable without manual steps

**Affected files/components:** `booking_system_frontend/` (no Dockerfile), `docs/ONBOARDING.md`

**Description:**
The frontend has no Dockerfile. `docs/ONBOARDING.md` explicitly notes this gap. The only documented deployment path for the frontend is `npm run build` followed by manual upload of the `dist/` folder to a static host. There is no Nginx or Caddy configuration, no multi-stage build (Node build → static serve), and no `VITE_API_URL` injection mechanism for containerised environments.

**Consequence of leaving unaddressed:**
The frontend cannot be included in a Docker Compose setup, a Kubernetes deployment, or any container-based CI pipeline. Deployment requires a separate static hosting service with manual build-time injection of `VITE_API_URL`.

---

### OR-09 · [MEDIUM] · [DAYS] — No backend `.env.example`; DB URL is hardcoded in source

**Affected files/components:** `booking_system_backend/db.py:5`, `booking_system_backend/requirements.txt` (`python-dotenv` installed but unused)

**Description:**
`SQLALCHEMY_DATABASE_URL = 'sqlite:///./booking.db'` is hardcoded in `db.py`. `python-dotenv` is installed but no `.env` file, `.env.example`, or `os.getenv()` call exists anywhere in the backend. The frontend has a `.env.example` documenting `VITE_API_URL`. The backend has no equivalent. Any configuration change (DB host, port, credentials) requires a source code edit.

**Consequence of leaving unaddressed:**
Moving to PostgreSQL, MySQL, or any other database in production requires editing source code rather than setting an environment variable. The pattern of "install dotenv but not use it" misleads contributors into assuming env-based configuration exists.

---

### OR-10 · [MEDIUM] · [WEEKS] — No Maven wrapper; Maven version is uncontrolled for the Java service

**Affected files/components:** `booking_system_inventory_hold_service/` (no `mvnw`)

**Description:**
No `mvnw` / `.mvn/wrapper/maven-wrapper.properties` exists. Any developer or CI system must have Maven pre-installed at an assumed version. The `spring-boot-maven-plugin` version is inherited from the Spring Boot parent BOM; different Maven versions can produce different dependency resolution outcomes.

**Consequence of leaving unaddressed:**
Builds of the Java service produce different results depending on the Maven version available in the build environment. CI systems without Maven pre-installed cannot build the service without additional setup steps not documented anywhere.

---

### OR-11 · [LOW] · [DAYS] — `start.sh` uses `npm install` instead of `npm ci`, bypassing lock file enforcement

**Affected files/components:** `start.sh:69`

**Description:**
Line 69 runs `npm install` when `node_modules` is absent. `npm install` updates the lock file if `package.json` has changed and resolves within declared caret ranges; `npm ci` enforces the exact versions in `package-lock.json` and fails if there is a mismatch. Using `npm install` means a developer's first-time setup may produce different installed versions than those recorded in the lock file.

**Consequence of leaving unaddressed:**
The `package-lock.json` provides no reproducibility guarantee for first-time setups using `start.sh`. Two developers setting up on different days may have different resolved versions despite using the same repository.

---

## 4. Code Quality Debt

---

### CQ-01 · [HIGH] · [WEEKS] — No schema migration system; all schema changes require data wipe

**Affected files/components:** `booking_system_backend/models.py`, `booking_system_backend/db.py:15`, `AGENTS.md`

**Description:**
`Base.metadata.create_all()` is the only schema management mechanism. It creates tables that do not exist but does not apply changes to existing tables — a new column, index, or constraint is invisible until the database is dropped and recreated. There is no Alembic, no version table, and no migration history. `AGENTS.md` states this explicitly: *"No migrations — schema changes require editing `models.py`; `create_all` runs on startup."* This also means that the unconditional `seed()` wipe serves a dual purpose: it is the only way to apply schema changes.

**Consequence of leaving unaddressed:**
Adding a `payment_status` column, an index on `email`, or a FK constraint to `Booking` requires wiping the entire database. In production this is equivalent to data loss. The system has no ability to evolve its schema without downtime and data destruction.

---

### CQ-02 · [HIGH] · [WEEKS] — Zero test coverage for all six MCP tools

**Affected files/components:** `booking_system_backend/server.py:19–97` (all MCP tools), `booking_system_backend/tests/`

**Description:**
The six MCP tools (`list_flights`, `book_flight`, `get_bookings`, `cancel_booking`, `register_user`, `get_user_id`) are completely untested. No test in `test_rest.py` or `test_services.py` exercises the MCP path. The MCP tools have a materially different session-management pattern (own `SessionLocal()` + `try/finally`) and error-handling pattern (raise `Exception` on `ErrorResponse`) from REST endpoints. The `conftest.py` only patches `SessionLocal` for the REST path.

**Consequence of leaving unaddressed:**
A bug introduced in the MCP session lifecycle (e.g. a session not being closed on error) would go undetected. The MCP error-raising path — `raise Exception(result.details or result.error)` — has never been exercised by a test. Any MCP-specific regression is invisible until a human agent manually invokes the tool.

---

### CQ-03 · [HIGH] · [DAYS] — Error responses always return HTTP 200; no HTTP status code semantics

**Affected files/components:** `booking_system_backend/server.py:145,160,169,175`, `booking_system_backend/tests/test_rest.py:56,83,133,219`

**Description:**
`Union[SuccessSchema, ErrorResponse]` is the return type of all fallible endpoints. `FLIGHT_NOT_FOUND`, `USER_NOT_FOUND`, `NO_SEATS_AVAILABLE`, `EMAIL_EXISTS`, and `ALREADY_CANCELLED` all return HTTP 200. The test suite explicitly asserts `response.status_code == 200` for error cases, cementing this as expected behaviour. HTTP monitoring, SLO alerting, and API gateway rate limiting all operate on status codes by default.

**Consequence of leaving unaddressed:**
Error rate monitoring based on HTTP status codes (the industry default) reports 0% error rate even when every request returns an application-level error. API consumers and load balancers cannot distinguish success from failure without parsing the response body. Correcting this later requires updating all call sites in the frontend and all tests simultaneously.

---

### CQ-04 · [HIGH] · [WEEKS] — No frontend test suite; `npm run build` is the only automated check

**Affected files/components:** `booking_system_frontend/src/` (entire directory), `AGENTS.md`

**Description:**
No Vitest, Jest, Playwright, or Cypress configuration exists. `AGENTS.md` states: *"Frontend has no test suite; `npm run build` serves as the integration check."* The build check validates TypeScript types and bundling but does not test component rendering, user interactions, API integration behaviour, or the `isErrorResponse` discrimination logic that is the sole error-handling mechanism across all pages.

**Consequence of leaving unaddressed:**
UI regressions — broken booking flows, broken cancellation confirmation, incorrect error message display — are only detectable by a human loading the application in a browser. The `isErrorResponse` function and every component that consumes it are untested.

---

### CQ-05 · [MEDIUM] · [DAYS] — `Booking.status` is an unconstrained string with no enum at any layer

**Affected files/components:** `booking_system_backend/models.py:27`, `booking_system_backend/schemas.py:28`, `booking_system_backend/seed.py:47`, `booking_system_backend/services/booking.py:48,79`

**Description:**
`status = Column(String, nullable=False)` accepts any string at the DB level. `BookingOut.status` is typed `str`. The service layer writes only `"booked"` and `"cancelled"`. `seed.py` also writes `"completed"`. No Python `Literal`, `Enum`, or `CheckConstraint` enforces the set of valid values at any layer. The frontend TypeScript type `'booked' | 'cancelled' | 'completed'` is the strongest constraint in the entire system, but it is only enforced at compile time on the client side and is not validated when the API response is received.

**Consequence of leaving unaddressed:**
A direct DB insert or a future service change can introduce an undocumented fourth status. The frontend `BookingCard` switch statement falls through to a `default` case (clock icon, no action) for unknown statuses. The system has no mechanism to detect or reject invalid status values.

---

### CQ-06 · [MEDIUM] · [WEEKS] — Backend bare-module import pattern requires `sys.path` manipulation in tests

**Affected files/components:** `booking_system_backend/tests/conftest.py:10`, `booking_system_backend/tests/test_rest.py:5`, `booking_system_backend/tests/test_services.py:5`

**Description:**
All backend modules use bare-name imports (`from models import ...`, `from db import ...`). This works when `server.py` is run from `booking_system_backend/` as a working directory, but requires every test file to insert the parent directory into `sys.path` at the top of the file: `sys.path.insert(0, str(Path(__file__).parent.parent))`. This pattern is fragile, non-idiomatic, and prevents the backend from being installed as a package or imported from outside its directory.

**Consequence of leaving unaddressed:**
Any test file that omits the `sys.path` manipulation will fail with `ModuleNotFoundError`. The backend cannot be structured as a proper Python package without refactoring all imports. IDE navigation and type checkers cannot resolve the bare imports without additional configuration.

---

### CQ-07 · [MEDIUM] · [DAYS] — `datetime.utcnow()` is deprecated; datetime values lack timezone info

**Affected files/components:** `booking_system_backend/services/booking.py:49`, `booking_system_backend/seed.py:49`

**Description:**
`datetime.utcnow()` was deprecated in Python 3.12. Both files use it to generate `booking_time` values stored as ISO strings. The resulting strings have no timezone suffix from `utcnow()` alone (e.g. `"2099-01-01T09:00:00"`) while seed data uses `.isoformat() + "Z"` (line 54 of `seed.py`), creating an inconsistency in the format of stored datetimes. Some stored values have a trailing `Z` and some do not, depending on which code path created the record.

**Consequence of leaving unaddressed:**
Datetime string format is inconsistent across records in the same column. Parsing in the frontend via `date-fns`'s `parseISO` works with both formats, but any code that performs string comparison or ordering on `booking_time` values will produce incorrect results for mixed-format records.

---

### CQ-08 · [MEDIUM] · [DAYS] — `isErrorResponse` uses `any` parameter type, defeating TypeScript's type narrowing

**Affected files/components:** `booking_system_frontend/src/services/api.ts:109–113`

**Description:**
```typescript
export const isErrorResponse = (
  response: any
): response is ErrorResponse => {
  return response && response.success === false;
};
```
The parameter is typed as `any`, which means TypeScript does not verify the argument type at any of the five call sites (`BookingModal.tsx:38`, `MyBookings.tsx:63`, `UserIdentification.tsx:35,48`). The function is the sole mechanism for discriminating success from error across the entire frontend. A future refactor that changes the `ErrorResponse` shape would produce no compiler error at any call site.

**Consequence of leaving unaddressed:**
The single point of error discrimination in the frontend provides no compile-time safety. Shape changes in `ErrorResponse` will silently fail at runtime. The `any` type propagates through TypeScript's inference, meaning the compiler cannot assist in detecting misuse of the discriminant.

---

### CQ-09 · [MEDIUM] · [DAYS] — `sample_booking_data` test fixture is defined but never used; contains hardcoded IDs

**Affected files/components:** `booking_system_backend/tests/conftest.py:92–99`

**Description:**
The `sample_booking_data` fixture returns `{"user_id": 1, "name": "Test User", "flight_id": 1}`. No test references it. The hardcoded `user_id: 1` and `flight_id: 1` are unreliable — SQLite auto-increment IDs in an in-memory database are not guaranteed to start at 1 in all configurations, and the fixture's existence implies a future test could use these IDs incorrectly.

**Consequence of leaving unaddressed:**
A future developer may use the fixture expecting it to work, only to discover the hardcoded IDs are not reliable. The fixture is dead weight that adds confusion to the test infrastructure.

---

### CQ-10 · [LOW] · [DAYS] — `spring-cloud.version` property declared in `pom.xml` but unused

**Affected files/components:** `booking_system_inventory_hold_service/pom.xml:33`

**Description:**
`<spring-cloud.version>2023.0.1</spring-cloud.version>` is declared in `<properties>` but is referenced by no `<dependencyManagement>` BOM import and no `<dependency>`. No Spring Cloud libraries are present in the dependency list.

**Consequence of leaving unaddressed:**
The property creates a false impression that Spring Cloud is part of the dependency tree. A developer adding a Spring Cloud dependency would reference this property for the BOM version — but the BOM import is also absent, so the version would not be applied correctly.

---

### CQ-11 · [LOW] · [DAYS] — `Layout.tsx` hardcodes toast style colours as raw hex values

**Affected files/components:** `booking_system_frontend/src/components/layout/Layout.tsx:23–40`

**Description:**
The `Toaster` configuration in `Layout.tsx` uses raw hex values for colours:
```typescript
background: 'rgba(10, 25, 41, 0.95)',  // should be space-blue
color: '#F9FAFB',                        // should be star-white
primary: '#10B981',                      // should be alien-green
```
`AGENTS.md` and the project rules explicitly state: *"use them (`cosmic-purple`, `nebula-pink`, etc.) rather than raw hex values."* The `Toaster` component accepts inline style objects that cannot reference Tailwind classes, but the values should at minimum be imported from a shared design token file rather than duplicated inline.

**Consequence of leaving unaddressed:**
If the `space-blue` or `alien-green` token values change in `tailwind.config.js`, the toast notification colours will silently drift from the design system. The raw hex values are a maintenance divergence point.

---

### CQ-12 · [LOW] · [DAYS] — `useEffect` in `UserProvider` writes to `localStorage` redundantly

**Affected files/components:** `booking_system_frontend/src/hooks/useUser.tsx:36–41`

**Description:**
`setUser()` (lines 23–30) already writes to `localStorage` synchronously when called with a non-null value. The `useEffect` at lines 36–41 also writes to `localStorage` whenever `user` changes. On initial render with a stored user (loaded from `localStorage` on line 12), the `useEffect` fires and writes the loaded value back to `localStorage` — a read-then-write with no net change. The two write paths have different behaviour: `setUser(null)` removes the key, but the `useEffect` only writes when `user` is truthy, creating an asymmetry.

**Consequence of leaving unaddressed:**
The dual-write path obscures where session persistence is actually managed. A developer modifying session storage logic must understand both paths to avoid introducing a regression where one path overrides the other.

---

## 5. Summary Table

### By Category

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Architecture Debt | 2 | 3 | 2 | 0 | **7** |
| Security Debt | 2 | 4 | 2 | 0 | **8** |
| Operational Readiness Debt | 3 | 4 | 3 | 1 | **11** |
| Code Quality Debt | 0 | 4 | 5 | 3 | **12** |
| **Total** | **7** | **15** | **12** | **4** | **38** |

### By Severity

| Severity | Count | Items |
|---|---|---|
| **Critical** | 7 | AD-01, AD-02, OR-01, OR-02, OR-03, SD-01, SD-02 |
| **High** | 15 | AD-03, AD-04, AD-05, CQ-01, CQ-02, CQ-03, CQ-04, OR-04, OR-05, OR-06, OR-07, SD-03, SD-04, SD-05, SD-06 |
| **Medium** | 12 | AD-06, AD-07, CQ-05, CQ-06, CQ-07, CQ-08, CQ-09, OR-08, OR-09, OR-10, SD-07, SD-08 |
| **Low** | 4 | CQ-10, CQ-11, CQ-12, OR-11 |

### By Effort to Resolve

| Effort | Count | Notes |
|---|---|---|
| **[DAYS]** | 13 | Individual file changes, configuration additions, or isolated policy decisions |
| **[WEEKS]** | 18 | Requires coordinated changes across multiple files or components |
| **[MONTHS]** | 7 | Requires new subsystems, architectural changes, or sustained effort across all three services |

---

*Assessment generated from direct source file analysis. No implementation plans or code suggestions are included. All findings are grounded in specific file evidence cited above.*
