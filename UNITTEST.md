# Unit Testing Strategy — Galaxium Travels

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Testing Approach by Module](#2-testing-approach-by-module)
3. [Test File Paths and Naming Conventions](#3-test-file-paths-and-naming-conventions)
4. [Test Commands](#4-test-commands)
5. [Frameworks and Libraries](#5-frameworks-and-libraries)
6. [Quality Metrics and Coverage Thresholds](#6-quality-metrics-and-coverage-thresholds)

---

## 1. Architecture Overview

Galaxium Travels is composed of two independently-deployable backend services plus a React frontend. Unit testing focuses on the two backend services.

### 1.1 Python / FastAPI Backend (`booking_system_backend/`)

| Layer | Files | Role |
|---|---|---|
| **Service layer** | `services/booking.py`, `services/flight.py`, `services/user.py` | All business logic; returns `Model \| ErrorResponse` — no HTTP concerns |
| **REST layer** | `server.py` | FastAPI route handlers; thin adapters over the service layer |
| **MCP tools** | `server.py` | FastMCP tool definitions; bypass FastAPI DI and call `SessionLocal()` directly |
| **ORM models** | `models.py` | SQLAlchemy `User`, `Flight`, `Booking` |
| **Schemas** | `schemas.py` | Pydantic models: `BookingOut`, `ErrorResponse`, `SeatClass` |
| **Database** | `db.py` | `SessionLocal`, `get_db()` dependency, SQLite engine |

Key testing considerations:
- Service functions return `Union` types; callers use `isinstance(result, ErrorResponse)` — tests must cover both branches.
- `book_flight()` validates both `user_id` and `name`; name mismatch is a distinct error code (`NAME_MISMATCH`).
- Tests must patch `SessionLocal` in **both** `db` and `server` modules (see [`conftest.py` lines 49–50](booking_system_backend/tests/conftest.py:49)).
- The `seed` function must be disabled via monkeypatch during tests to prevent demo data pollution.

### 1.2 Java / Spring Boot Hold Service (`booking_system_inventory_hold_service/`)

| Layer | Files | Role |
|---|---|---|
| **Service layer** | `service/QuoteService.java`, `service/HoldService.java`, `service/PricingService.java` | Business logic; `@Transactional`; throws `IllegalArgumentException` / `IllegalStateException` |
| **REST controllers** | `api/QuoteController.java`, `api/HoldController.java`, `api/HealthController.java` | Spring MVC; translates exceptions to HTTP status codes |
| **Domain entities** | `domain/Quote.java`, `domain/Hold.java`, `domain/AuditEvent.java` | JPA entities with `@PrePersist` / `@PreUpdate` lifecycle hooks |
| **Repositories** | `repository/QuoteRepository.java`, `repository/HoldRepository.java`, `repository/AuditEventRepository.java` | Spring Data JPA; `HoldRepository` has a custom `findExpiredHolds` JPQL query |
| **Scheduler** | `scheduler/HoldExpirationScheduler.java` | `@Scheduled` component; marks expired holds and writes audit events |
| **HTTP client** | `client/PythonBackendClient.java` | Raw `HttpURLConnection` (no RestTemplate); calls Python `/internal/bookings/from-hold` |
| **Web console** | `web/AgentConsoleController.java` | JSP-based agent console — low test priority |

Key testing considerations:
- No existing test sources (`src/test/` is absent) — all Java tests must be created from scratch.
- `HoldService.confirmHold()` calls `PythonBackendClient` — the client **must** be mocked in unit tests.
- `HoldService.createHold()` checks both quote existence and quote expiry; both branches require distinct test cases.
- `PricingService.calculatePrice()` uses a deterministic formula — fully unit-testable with no mocks.
- `HoldExpirationScheduler` depends only on its repositories — test the `expireHolds()` method directly by injecting mocks.
- The project targets **Java 8** (source/target `1.8`) with Spring Boot **2.7.18** and does **not** use Lombok.

---

## 2. Testing Approach by Module

### 2.1 Python — Service Layer (Highest Priority)

The service layer is pure business logic with SQLAlchemy sessions injected. Use an in-memory SQLite database (`StaticPool`) so tests are fast and fully isolated. No mocking of the DB layer is needed; set up real entities and assert real state changes.

**`services/booking.py`** — [`TestBookingService`](booking_system_backend/tests/test_services.py:268)

| Scenario | Expected result |
|---|---|
| Valid user, valid flight, seats available | `BookingOut` with `status="booked"`; seat count decremented |
| Flight not found | `ErrorResponse(error_code="FLIGHT_NOT_FOUND")` |
| No seats available in requested class | `ErrorResponse(error_code="NO_SEATS_AVAILABLE")` |
| User ID does not exist | `ErrorResponse(error_code="USER_NOT_FOUND")` |
| User ID exists but name does not match | `ErrorResponse(error_code="NAME_MISMATCH")` |
| Invalid seat class string | `ErrorResponse(error_code="INVALID_SEAT_CLASS")` |
| Business / galaxium class booking | `BookingOut`; correct multiplier applied to `price_paid` |
| Cancel booked booking | `BookingOut(status="cancelled")`; seat restored to correct class |
| Cancel non-existent booking | `ErrorResponse(error_code="BOOKING_NOT_FOUND")` |
| Cancel already-cancelled booking | `ErrorResponse(error_code="ALREADY_CANCELLED")` |
| Get bookings for user with bookings | List of `BookingOut` |
| Get bookings for user with none | Empty list `[]` |

**`services/flight.py`** — [`TestFlightService`](booking_system_backend/tests/test_services.py:12), [`TestFlightFiltering`](booking_system_backend/tests/test_services.py:487)

Cover all filter/sort parameters: `origin`, `destination`, `departure_date_from/to`, `min_price/max_price`, `seat_class`, `departure_time_period`, `min_duration/max_duration`, `min_seats_available`, `route_category`, `has_economy/has_business/has_galaxium`, `sort`/`order`. Each filter should be tested individually and in combination.

**`services/user.py`**

| Scenario | Expected result |
|---|---|
| Register with new email | `User` object with assigned `user_id` |
| Register with duplicate email | `ErrorResponse(error_code="EMAIL_EXISTS")` |
| Get user — found | `User` object |
| Get user — not found | `ErrorResponse(error_code="USER_NOT_FOUND")` |

### 2.2 Python — REST Layer

Use `fastapi.testclient.TestClient` with the `client` fixture from [`conftest.py`](booking_system_backend/tests/conftest.py). The REST tests exercise the full FastAPI request/response cycle including validation, serialisation, and HTTP status codes.

Coverage target: every route in `server.py` — `GET /`, `GET /flights`, `POST /register`, `GET /user`, `POST /book`, `GET /bookings/{user_id}`, `POST /cancel/{booking_id}`, and the hold proxy endpoints (`POST /quotes`, `POST /quotes/{id}/holds`, `POST /holds/{id}/confirm`, `POST /holds/{id}/release`).

Key REST-specific cases:
- Verify `Content-Type: application/json` responses.
- Verify that even error paths return **HTTP 200** (per project convention — callers inspect the body, not the status code).
- Verify hold proxy endpoints return `{"error": "..."}` with HTTP 200 when the Java service is unavailable (patch `httpx` client).

### 2.3 Java — `PricingService` (No-mock unit tests)

[`PricingService`](booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/PricingService.java) has zero dependencies and a deterministic formula. It is the simplest class to test and a good starting point.

```
src/test/java/com/galaxium/holdservice/service/PricingServiceTest.java
```

| Scenario | Expected result |
|---|---|
| `economy` seat, any flight ID | `500_000 × (1.0 + (flightId % 3) × 0.1)` |
| `business` seat | `2_500_000 × multiplier` |
| `first` seat | `5_000_000 × multiplier` |
| Unknown seat class | Falls back to `500_000` base price |
| Case sensitivity — `"ECONOMY"` | Falls back (map key is lowercase) |
| `flightId % 3 == 0` | Multiplier is exactly `1.0` |
| `flightId % 3 == 1` | Multiplier is `1.1` |
| `flightId % 3 == 2` | Multiplier is `1.2` |

### 2.4 Java — `QuoteService` (Mock repository, real pricing)

```
src/test/java/com/galaxium/holdservice/service/QuoteServiceTest.java
```

Mock `QuoteRepository` and `AuditEventRepository` with Mockito. Inject the real `PricingService` (no external deps) or mock it for isolation.

| Scenario | Expected result |
|---|---|
| Valid `CreateQuoteRequest` | Returns saved `Quote`; `quoteRepository.save()` called once |
| Quote ID format | Matches `Q-<year>-<6-digit-count>` |
| Expiry | `expiresAt` is approximately 24 h from now |
| Total price calculation | `pricePerSeat × quantity` |
| Audit event created | `auditEventRepository.save()` called once with correct entity/event type |
| `getQuote` — found | Returns quote from repository |
| `getQuote` — not found | Returns `null` |

### 2.5 Java — `HoldService` (Mock all deps)

```
src/test/java/com/galaxium/holdservice/service/HoldServiceTest.java
```

Mock `HoldRepository`, `QuoteRepository`, `AuditEventRepository`, and `PythonBackendClient`. Inject `holdDurationMinutes` via `ReflectionTestUtils.setField()` or a `@Value` test property.

| Scenario | Expected result |
|---|---|
| `createHold` — valid, non-expired quote | `Hold` saved with `HELD` status; `reservedUntil` ≈ now + 15 min |
| `createHold` — quote not found | `IllegalArgumentException("Quote not found: ...")` |
| `createHold` — expired quote | `IllegalStateException("Quote has expired")` |
| `getHold` — found | Returns hold |
| `getHold` — not found | Returns `null` |
| `confirmHold` — valid `HELD`, not expired | Calls `pythonBackendClient.createBookingFromHold()`; saves `CONFIRMED`; sets `externalBookingReference` |
| `confirmHold` — already `CONFIRMED` | Returns hold immediately; no Python call |
| `confirmHold` — not in `HELD` status | `IllegalStateException("Hold is not in HELD status: ...")` |
| `confirmHold` — expired (past `reservedUntil`) | Sets `EXPIRED`; throws `IllegalStateException("Hold has expired")` |
| `confirmHold` — Python backend failure | Sets `CONFIRMATION_FAILED`; sets `errorMessage`; throws `IllegalStateException` |
| `confirmHold` — quote missing at confirm time | `IllegalStateException("Quote not found: ...")` |
| `releaseHold` — valid `HELD` | Sets `RELEASED`; audit event written |
| `releaseHold` — not found | `IllegalArgumentException` |
| `releaseHold` — not in `HELD` status | `IllegalStateException("Hold cannot be released, ...")` |

### 2.6 Java — `HoldExpirationScheduler`

```
src/test/java/com/galaxium/holdservice/scheduler/HoldExpirationSchedulerTest.java
```

Mock `HoldRepository` and `AuditEventRepository`.

| Scenario | Expected result |
|---|---|
| No expired holds | No saves called on either repository |
| One expired hold | `hold.setStatus(EXPIRED)`; `holdRepository.save()` called; `auditEventRepository.save()` called |
| Multiple expired holds | All holds updated; audit events created for each |

### 2.7 Java — REST Controllers (MockMvc slice tests)

```
src/test/java/com/galaxium/holdservice/api/QuoteControllerTest.java
src/test/java/com/galaxium/holdservice/api/HoldControllerTest.java
```

Use `@WebMvcTest` with `@MockBean` for the service layer. Tests verify HTTP status codes, response JSON structure, and that controller exception handling correctly maps `IllegalArgumentException` → 404 and `IllegalStateException` → 400.

| Endpoint | Scenarios |
|---|---|
| `POST /api/v1/quotes` | 201 Created with body; 400 on invalid request (missing required fields) |
| `GET /api/v1/quotes/{id}` | 200 with body; 404 when not found |
| `POST /api/v1/quotes/{id}/holds` | 201 Created; 404 on unknown quote; 400 on expired quote |
| `GET /api/v1/holds/{id}` | 200 with body; 404 when not found |
| `POST /api/v1/holds/{id}/confirm` | 200 with body; 404 on unknown hold; 400 on invalid state |
| `POST /api/v1/holds/{id}/release` | 200 with body; 404 on unknown hold; 400 on invalid state |

### 2.8 Java — `PythonBackendClient`

```
src/test/java/com/galaxium/holdservice/client/PythonBackendClientTest.java
```

Use `MockWebServer` (from OkHttp, available on the test classpath via `spring-boot-starter-test`) or a `WireMock` server to stub HTTP responses.

| Scenario | Expected result |
|---|---|
| 200 response with valid JSON | Returns `BookingResponse` with correct fields |
| Non-2xx response | Throws `BookingCreationException` with response body in message |
| Connection timeout / IOException | Throws `BookingCreationException` wrapping the original exception |
| Null/empty error stream on non-2xx | Handled gracefully; no NPE |

---

## 3. Test File Paths and Naming Conventions

### Python

- **Location:** `booking_system_backend/tests/`
- **File naming:** `test_<module>.py` (e.g., `test_services.py`, `test_rest.py`)
- **Class naming:** `Test<Component>` (e.g., `TestBookingService`, `TestFlightsEndpoint`)
- **Method naming:** `test_<scenario_description>` (e.g., `test_book_flight_name_mismatch`)
- **Configuration:** [`pytest.ini`](booking_system_backend/pytest.ini) — `testpaths = tests`, `python_files = test_*.py`

Current test files:
```
booking_system_backend/tests/
├── conftest.py                  # Shared fixtures: db_session, client, sample data
├── test_services.py             # Service-layer unit tests
└── test_rest.py                 # REST endpoint integration tests
```

### Java

- **Location:** `booking_system_inventory_hold_service/src/test/java/com/galaxium/holdservice/`
- **Package structure:** mirrors `src/main/java/` exactly
- **File naming:** `<ClassUnderTest>Test.java`
- **Method naming:** `should<ExpectedBehavior>_when<Condition>()` or descriptive camelCase

Test files to create (none currently exist):
```
booking_system_inventory_hold_service/src/test/java/com/galaxium/holdservice/
├── service/
│   ├── PricingServiceTest.java
│   ├── QuoteServiceTest.java
│   └── HoldServiceTest.java
├── scheduler/
│   └── HoldExpirationSchedulerTest.java
├── api/
│   ├── QuoteControllerTest.java
│   └── HoldControllerTest.java
└── client/
    └── PythonBackendClientTest.java
```

---

## 4. Test Commands

### Python Backend

Run from the `booking_system_backend/` directory (must be run from there per project convention).

```bash
# Install dependencies (first time)
cd booking_system_backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run all unit tests
cd booking_system_backend && pytest

# Run with verbose output (already in pytest.ini addopts)
cd booking_system_backend && pytest -v

# Run a specific test file
cd booking_system_backend && pytest tests/test_services.py -v

# Run a specific test class
cd booking_system_backend && pytest tests/test_services.py::TestBookingService -v

# Run a single test
cd booking_system_backend && pytest tests/test_services.py::TestBookingService::test_book_flight_name_mismatch -v

# Run with coverage report (terminal)
cd booking_system_backend && pytest --cov=. --cov-report=term-missing

# Run with coverage — exclude test files and generated code
cd booking_system_backend && pytest --cov=. --cov-report=term-missing \
  --cov-omit="tests/*,seed.py,.venv/*"

# Run with coverage — generate HTML report
cd booking_system_backend && pytest --cov=. --cov-report=html \
  --cov-omit="tests/*,seed.py,.venv/*"
# Open: booking_system_backend/htmlcov/index.html

# Run with coverage — generate XML (for CI)
cd booking_system_backend && pytest --cov=. --cov-report=xml \
  --cov-omit="tests/*,seed.py,.venv/*"
```

### Java Hold Service

Run from the `booking_system_inventory_hold_service/` directory. Requires Java 8/17/21 and Maven.

```bash
# Run all unit tests
cd booking_system_inventory_hold_service && mvn test

# Run a specific test class
cd booking_system_inventory_hold_service && mvn test -Dtest=PricingServiceTest

# Run a specific test method
cd booking_system_inventory_hold_service && mvn test -Dtest=HoldServiceTest#shouldThrowWhenQuoteNotFound

# Run all tests in a package
cd booking_system_inventory_hold_service && mvn test -Dtest="com.galaxium.holdservice.service.*"

# Run tests with coverage report (JaCoCo is already configured in pom.xml)
cd booking_system_inventory_hold_service && mvn test
# Report generated at: target/site/jacoco/index.html

# Run tests and generate full site with coverage
cd booking_system_inventory_hold_service && mvn test jacoco:report
# Open: target/site/jacoco/index.html

# Skip tests (for build-only scenarios)
cd booking_system_inventory_hold_service && mvn package -DskipTests

# Run with debug output
cd booking_system_inventory_hold_service && mvn test -Dsurefire.useFile=false
```

> **Note:** JaCoCo is already configured in [`pom.xml`](booking_system_inventory_hold_service/pom.xml:93) with `prepare-agent` and `report` goals bound to the `test` phase. Running `mvn test` automatically generates the coverage report.

---

## 5. Frameworks and Libraries

### Python

All frameworks are already present in [`requirements.txt`](booking_system_backend/requirements.txt).

| Library | Version | Purpose |
|---|---|---|
| `pytest` | latest | Test runner; supports `conftest.py`, fixtures, parametrize |
| `pytest-cov` | latest | Coverage integration with `coverage.py`; `--cov-report=term-missing\|html\|xml` |
| `pytest-asyncio` | latest | Required if async FastAPI routes are tested outside `TestClient` |
| `httpx` | latest | `TestClient` dependency; enables `fastapi.testclient.TestClient` |
| `sqlalchemy` | latest | In-memory `StaticPool` SQLite engine for isolated DB fixtures |

**Fixture strategy** (follows existing [`conftest.py`](booking_system_backend/tests/conftest.py) pattern):
- `db_session` — function-scoped; creates and drops schema around each test.
- `client` — function-scoped; wraps `TestClient` with `db_session`, patches `SessionLocal` in both `db` and `server` modules, disables seeding.
- Sample data fixtures (`sample_user_data`, `sample_flight_data`, `sample_booking_data`) — function-scoped dicts.

### Java

All libraries are provided by `spring-boot-starter-test` which is already declared in [`pom.xml`](booking_system_inventory_hold_service/pom.xml:79).

| Library | Provided by | Purpose |
|---|---|---|
| **JUnit 5** (`junit-jupiter`) | `spring-boot-starter-test` | Test runner; `@Test`, `@BeforeEach`, `@AfterEach`, `@ParameterizedTest` |
| **Mockito** (`mockito-core`, `mockito-junit-jupiter`) | `spring-boot-starter-test` | Mocking: `@Mock`, `@InjectMocks`, `@Captor`, `verify()`, `when().thenReturn()` |
| **Spring Test** (`spring-test`) | `spring-boot-starter-test` | `@WebMvcTest`, `MockMvc`, `@MockBean`, `ReflectionTestUtils` |
| **AssertJ** | `spring-boot-starter-test` | Fluent assertions: `assertThat(...).isEqualTo(...)`, `assertThatThrownBy(...)` |
| **JaCoCo** (`jacoco-maven-plugin 0.8.15`) | already in `pom.xml` | Bytecode instrumentation + HTML/XML coverage reports |

**Recommended test structure for service tests:**

```java
@ExtendWith(MockitoExtension.class)
class HoldServiceTest {
    @Mock HoldRepository holdRepository;
    @Mock QuoteRepository quoteRepository;
    @Mock AuditEventRepository auditEventRepository;
    @Mock PythonBackendClient pythonBackendClient;

    @InjectMocks HoldService holdService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(holdService, "holdDurationMinutes", 15);
    }
    // ...
}
```

**Recommended test structure for controller slice tests:**

```java
@WebMvcTest(HoldController.class)
class HoldControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean HoldService holdService;
    // ...
}
```

---

## 6. Quality Metrics and Coverage Thresholds

### Coverage Targets

| Module | Instruction Coverage | Branch Coverage | Rationale |
|---|---|---|---|
| `services/` (Python) | ≥ 90 % | ≥ 85 % | Core business logic; every error branch must be tested |
| `server.py` REST routes | ≥ 80 % | ≥ 75 % | Thin adapter; proxy endpoints need mock-based tests |
| `service/` (Java) | ≥ 85 % | ≥ 80 % | All state-machine transitions in `HoldService` must be covered |
| `api/` (Java controllers) | ≥ 80 % | ≥ 75 % | Exception-to-HTTP mapping is the critical path |
| `scheduler/` (Java) | ≥ 80 % | ≥ 75 % | Expiry loop has both empty and non-empty branches |
| `client/` (Java) | ≥ 75 % | ≥ 70 % | Network error paths need mock HTTP server |
| `domain/`, `repository/` | not enforced | not enforced | Generated/declarative code; coverage is incidental |

### Enforcing Thresholds (Java)

Add a `check` goal to the JaCoCo plugin in [`pom.xml`](booking_system_inventory_hold_service/pom.xml) to fail the build on regressions:

```xml
<execution>
    <id>check</id>
    <goals><goal>check</goal></goals>
    <configuration>
        <rules>
            <rule>
                <element>PACKAGE</element>
                <limits>
                    <limit>
                        <counter>INSTRUCTION</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.80</minimum>
                    </limit>
                    <limit>
                        <counter>BRANCH</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.75</minimum>
                    </limit>
                </limits>
                <excludes>
                    <exclude>com.galaxium.holdservice.domain.*</exclude>
                    <exclude>com.galaxium.holdservice.repository.*</exclude>
                    <exclude>com.galaxium.holdservice.web.*</exclude>
                    <exclude>com.galaxium.holdservice.util.*</exclude>
                </excludes>
            </rule>
        </rules>
    </configuration>
</execution>
```

### Enforcing Thresholds (Python)

Add a `[coverage:report]` section to `pytest.ini` or a `.coveragerc` file:

```ini
# booking_system_backend/.coveragerc
[run]
source = .
omit =
    tests/*
    seed.py
    .venv/*

[report]
fail_under = 80
show_missing = true
exclude_lines =
    pragma: no cover
    if __name__ == .__main__.:
```

Then run:

```bash
cd booking_system_backend && pytest --cov=. --cov-fail-under=80
```

### Test Quality Signals

Beyond raw line coverage, use these signals to evaluate test suite health:

| Signal | Target |
|---|---|
| **Mutation score** | Each logical branch (≥/≤, `==`, `!=`) has at least one test that would fail if the condition were inverted |
| **No overlapping assertions** | Each test asserts only the behaviour of the unit under test, not a chain of services |
| **Error-path coverage** | Every `ErrorResponse` code path in the Python services and every `IllegalArgumentException`/`IllegalStateException` throw site in Java has its own test method |
| **State assertions** | DB-state changes (seat count, hold/booking status, audit events) are asserted after the call, not just the return value |
| **Test isolation** | No test depends on execution order; each test creates its own data via fixtures or `@BeforeEach` setup |
| **No `Thread.sleep()`** | Time-dependent logic (expiry, scheduler) is tested by injecting controllable `Date` values, not real waits |
