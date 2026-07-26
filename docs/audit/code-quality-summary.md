# Code Quality Audit — Galaxium Travels

*Audit scope: Python backend · TypeScript frontend · Java inventory hold service*
*Files analysed: 18 source files + 1 pom.xml*
*Focus areas: input validation · error handling · authentication & credential storage · test coverage · type safety · logging*

---

## 1. Overview

| Component | Language | Files Analysed | Critical | High | Medium | Low |
|---|---|---|---|---|---|---|
| Python Backend | Python 3.x | `server.py`, `models.py`, `schemas.py`, `db.py`, `seed.py`, `services/booking.py`, `services/flight.py`, `services/user.py`, `tests/conftest.py`, `tests/test_rest.py`, `tests/test_services.py` | 2 | 5 | 6 | 4 |
| TypeScript Frontend | TypeScript / React | `src/services/api.ts`, `src/types/index.ts`, `src/hooks/useUser.tsx`, `src/pages/Flights.tsx`, `src/pages/MyBookings.tsx`, `src/components/user/UserIdentification.tsx`, `src/components/bookings/BookingModal.tsx`, `src/components/bookings/BookingCard.tsx`, `src/utils/formatters.ts` | 1 | 3 | 3 | 2 |
| Java Inventory Hold Service | Java (Spring Boot) | `pom.xml` only | 0 | 1 | 0 | 1 |
| **Total** | | **19 files** | **3** | **9** | **9** | **7** |

> **Severity definitions**
> - **Critical** — exploitable or data-corrupting in production without additional controls
> - **High** — directly degrades reliability, security posture, or correctness under realistic conditions
> - **Medium** — degrades maintainability, observability, or partial correctness
> - **Low** — style, minor type safety, or documentation gaps

---

## 2. Python Backend Findings

### 2.1 — `CRITICAL` — No authentication or authorisation on any endpoint

**File:** `server.py` · lines 133–178 (all route definitions)

**Description:** Every REST endpoint — including `POST /book`, `POST /cancel/{booking_id}`, and `GET /bookings/{user_id}` — is accessible without any token, session cookie, API key, or other credential. The "login" mechanism (`GET /user`) returns a `user_id` based on name and email alone; possession of another user's name and email is sufficient to cancel their bookings or retrieve their booking history. No FastAPI dependency, middleware, or header check guards any route.

**Impact:** Any actor who knows or can enumerate a victim's name and email can perform booking and cancellation operations on their behalf. `GET /user` leaks the `user_id` of any registered user given only their email address.

---

### 2.2 — `CRITICAL` — Race condition on `seats_available` under concurrent bookings

**File:** `services/booking.py` · lines 19, 44

**Description:** The availability check (`if flight.seats_available < 1`) and the decrement (`flight.seats_available -= 1`) are two separate statements with no database-level lock between them. SQLite's default isolation does not prevent two concurrent requests from both passing the check with `seats_available == 1` and both proceeding to decrement, resulting in `seats_available == -1`.

**Impact:** Overbooking is possible under any concurrent load. The `seats_available` column can go negative with no DB-level constraint preventing it.

---

### 2.3 — `HIGH` — User credentials (name + email) transmitted and stored in plaintext; used as authentication proof

**File:** `server.py` · line 176; `services/user.py` · lines 25–31; `schemas.py` · line 37

**Description:** `GET /user?name=&email=` accepts name and email as plain query-string parameters. The email address — the sole credential — appears in server logs, browser history, and proxy logs by virtue of being a query parameter. In `services/user.py` the match is a case-sensitive exact string comparison on two unprotected columns; there is no secret, token, or hashed secret involved.

**Impact:** Credentials are exposed in URL logs at every hop. The authentication model provides no protection against anyone who observes network traffic or server logs.

---

### 2.4 — `HIGH` — CORS wildcard allows credentials from any origin

**File:** `server.py` · lines 124–130

**Description:** `CORSMiddleware` is configured with `allow_origins=["*"]` combined with `allow_credentials=True`. The combination of a wildcard origin and `allow_credentials=True` is rejected by browsers as invalid per the CORS specification (browsers will refuse to send credentials to a wildcard-origin endpoint), but it also signals that no thought has been given to which origins should be trusted.

**Impact:** In development this is benign. In any deployment that adds token-based auth, the wildcard CORS policy would need to be corrected first or the auth layer would be bypassed cross-origin.

---

### 2.5 — `HIGH` — No logging in any service function or request handler

**File:** `server.py` (all handlers); `services/booking.py`; `services/user.py`; `services/flight.py`

**Description:** No `import logging` statement appears in any backend file. No log messages are emitted on successful operations, errors, or exceptional paths. The only output statement in the entire codebase is `print("Database seeded with elaborate demo data!")` in `seed.py` (line 59). FastAPI's default Uvicorn access log is the only observable signal of any server activity.

**Impact:** In production, diagnosing booking failures, identifying abuse patterns, or tracing a corrupted `seats_available` value is impossible without application-level logs. Errors that return `ErrorResponse` objects are silent from the server's perspective.

---

### 2.6 — `HIGH` — MCP error handling is inconsistent across tools

**File:** `server.py` · lines 25, 38–40, 52, 64–66, 78–80, 92–94

**Description:** The six MCP tools apply error handling non-uniformly. Four tools (`book_flight`, `cancel_booking`, `register_user`, `get_user_id`) correctly check `isinstance(result, ErrorResponse)` and raise. The remaining two (`list_flights` line 25, `get_bookings` line 52) return their service result directly with no error check. This is incidentally safe only because those two service functions currently never return `ErrorResponse`; there is no structural guarantee enforcing that assumption. Additionally, all four tools that do raise use bare `Exception(result.details or result.error)`, surfacing a human-readable guidance string as the exception message with no typed exception hierarchy and no distinction between client errors and server errors.

**Impact:** The inconsistent pattern means a future service change that introduces an `ErrorResponse` return path in `list_flights` or `get_bookings` would silently pass an `ErrorResponse` object to the MCP caller as a success value. Where errors are raised, MCP clients receive unstructured string exceptions; agents cannot distinguish `FLIGHT_NOT_FOUND` from `NO_SEATS_AVAILABLE` without string parsing.

---

### 2.7 — `HIGH` — `seed()` DB wipe runs on every startup with no environment guard

**File:** `seed.py` · lines 9–13; `server.py` · line 110

**Description:** `seed()` is called unconditionally in the FastAPI lifespan (`server.py:110`). It begins by deleting all rows from `bookings`, `users`, and `flights` with no check for environment (development vs production), no feature flag, and no way to disable it at runtime short of modifying the source.

**Impact:** A production restart irreversibly destroys all user and booking data. There is no migration system, backup, or rollback path.

---

### 2.8 — `MEDIUM` — `BookingRequest` schema has no field-level validation constraints

**File:** `schemas.py` · lines 18–21

**Description:** `BookingRequest` declares `user_id: int`, `name: str`, and `flight_id: int` with no Pydantic validators. Empty strings are accepted for `name`; non-positive integers are accepted for `user_id` and `flight_id`. The service layer (`services/booking.py:27`) then performs a database query with whatever values were passed.

**Impact:** Malformed requests reach the database layer. A `user_id` of `-1` or a blank `name` produces a `USER_NOT_FOUND` or `NAME_MISMATCH` error rather than a validation error, obscuring the actual cause and unnecessarily querying the database.

---

### 2.9 — `MEDIUM` — `UserRegistration` accepts names of arbitrary length and content

**File:** `schemas.py` · line 35–37; `services/user.py` · line 16

**Description:** `UserRegistration.name` is typed as `str` with no minimum length, maximum length, or pattern validator. A name of `""`, `" "`, or a 10 000-character string is accepted and written directly to the database.

**Impact:** The database can contain empty or whitespace-only names, which then appear in the `NAME_MISMATCH` error detail message and the booking confirmation UI.

---

### 2.10 — `MEDIUM` — `Booking.status` is an unconstrained string column with no DB-level or schema-level enum

**File:** `models.py` · line 27; `schemas.py` · line 28

**Description:** `status = Column(String, nullable=False)` accepts any string. `BookingOut.status` is typed as `str`. `seed.py` writes `"completed"` as a status (line 47), but no service function ever sets or validates `"completed"`. The only values the service layer ever writes are `"booked"` (line 48, `booking.py`) and `"cancelled"` (line 79, `booking.py`).

**Impact:** A future developer or direct DB insert can set `status` to any arbitrary value. The frontend's union type `'booked' | 'cancelled' | 'completed'` is a stronger constraint than the backend enforces, creating a silent schema drift risk.

---

### 2.11 — `MEDIUM` — `datetime.utcnow()` is deprecated in Python 3.12+

**File:** `services/booking.py` · line 49; `seed.py` · line 49

**Description:** Both files use `datetime.utcnow()`, which was deprecated in Python 3.12 (PEP 615) in favour of `datetime.now(timezone.utc)`. The deprecation warning is silent at runtime unless warnings are enabled.

**Impact:** Code will produce `DeprecationWarning` on Python 3.12+ and will break on a future Python version that removes the method.

---

### 2.12 — `MEDIUM` — `declarative_base()` import uses deprecated path

**File:** `models.py` · line 2

**Description:** `from sqlalchemy.ext.declarative import declarative_base` uses the legacy import path deprecated since SQLAlchemy 1.4. The current path is `from sqlalchemy.orm import declarative_base`.

**Impact:** Produces `SADeprecationWarning` in SQLAlchemy 2.x. Will raise `ImportError` if the legacy shim is removed in a future release.

---

### 2.13 — `MEDIUM` — `seed()` session is never closed on exception

**File:** `seed.py` · lines 8–58

**Description:** `seed()` opens a `SessionLocal()` on line 8 and closes it on line 58 at the bottom of the happy path. There is no `try/finally` block. If any of the `db.commit()` calls raise (e.g., due to a uniqueness violation), `db.close()` is never called, leaking the connection.

**Impact:** A failed seed leaves a dangling SQLAlchemy session. Under SQLite with `StaticPool` this is inconsequential, but it is a correctness issue that would matter with a real connection pool.

---

### 2.14 — `LOW` — `sample_booking_data` fixture is defined but never used

**File:** `tests/conftest.py` · lines 92–99

**Description:** The `sample_booking_data` fixture returns a hardcoded dict with `user_id: 1` and `flight_id: 1`. No test in `test_rest.py` or `test_services.py` references this fixture. The hardcoded IDs would be unreliable in practice because auto-increment IDs from in-memory SQLite are not guaranteed to start at 1 in all configurations.

**Impact:** Dead test infrastructure. The hardcoded IDs create a false impression that `user_id=1` is a reliable reference, which it is not across test runs.

---

### 2.15 — `LOW` — MCP tool for `register_user` does not validate email format

**File:** `server.py` · line 73; `schemas.py` · lines 35–37

**Description:** The REST `POST /register` endpoint validates the email via `UserRegistration.email: EmailStr`, which enforces RFC 5322 format. The MCP `register_user(name: str, email: str)` tool accepts a plain `str` with no validation. Any string is passed directly to `services/user.register_user()`.

**Impact:** The MCP path allows registering users with invalid email addresses that the REST path would reject, creating inconsistency in the data stored.

---

### 2.16 — `LOW` — No HTTP status code differentiation; all errors return 200

**File:** `server.py` · lines 145, 160, 169, 175

**Description:** All endpoints return `Union[SuccessSchema, ErrorResponse]` with no HTTP status code override. Client errors (`FLIGHT_NOT_FOUND`, `USER_NOT_FOUND`) and success responses both return HTTP 200. Standard HTTP semantics would use 404 for not-found and 409 for conflicts such as `EMAIL_EXISTS` or `ALREADY_CANCELLED`.

**Impact:** HTTP-level tooling (proxies, monitoring, CDN error pages) cannot distinguish errors from successes. The test suite explicitly asserts `response.status_code == 200` for error responses (e.g., `test_rest.py:56, 83, 133, 219`), which would need updating if this were corrected.

---

## 3. TypeScript Frontend Findings

### 3.1 — `CRITICAL` — User session stored in `localStorage` with no expiry or integrity check

**File:** `src/hooks/useUser.tsx` · lines 7, 12–18, 26

**Description:** The entire user session — including `user_id`, `name`, and `email` — is stored as an unencrypted, unsigned JSON string in `localStorage` under the key `galaxium_user`. On page load, the stored JSON is parsed and trusted unconditionally (lines 14–16). There is no expiry timestamp, no HMAC or signature, and no server-side session invalidation. Any JavaScript with access to the same origin (e.g., via XSS) can read or overwrite the session. A user can manually set any `user_id` in DevTools and the application will use it without challenge.

**Impact:** Session hijacking via XSS is trivial. A tampered `user_id` in localStorage allows impersonating any other user on the next API call.

---

### 3.2 — `HIGH` — `isErrorResponse` uses `any` parameter type, bypassing TypeScript safety

**File:** `src/services/api.ts` · lines 109–113

**Description:** `isErrorResponse(response: any)` accepts `any`, which means TypeScript performs no type checking on the argument at call sites. The function is the sole discriminant used across all API call sites (`BookingModal.tsx:38`, `MyBookings.tsx:63`, `UserIdentification.tsx:35, 48`). If the shape of `ErrorResponse` changes, no compile-time error is raised at these call sites.

**Impact:** Type safety at the error-discrimination layer is purely nominal. Runtime shape mismatches are not caught at compile time.

---

### 3.3 — `HIGH` — No client-side email format validation before API call

**File:** `src/components/user/UserIdentification.tsx` · lines 22–26, 97–104

**Description:** The submit handler checks only `!name.trim() || !email.trim()` (line 23) before dispatching the API call. The email `<Input>` has `type="email"` (line 99), which provides browser-native validation on form submit, but the handler calls `e.preventDefault()` (line 21) and then relies solely on the trim check, meaning an invalid email format (e.g., `"notanemail"`) passes the guard and is sent to the backend.

**Impact:** Invalid email strings are submitted to the REST endpoint, which then rejects them via Pydantic's `EmailStr`. The error surfaces as a generic API error rather than a clear client-side validation message.

---

### 3.4 — `HIGH` — `catch (error: any)` used in every async handler, losing type information

**File:** `src/pages/Flights.tsx:50`; `src/pages/MyBookings.tsx:41, 70`; `src/components/bookings/BookingModal.tsx:46`; `src/components/user/UserIdentification.tsx:60`

**Description:** Every `catch` block types its error as `any`. This suppresses TypeScript's ability to enforce what shape errors can be. Call sites then speculatively access `error.details` and `error.error` (e.g., `BookingModal.tsx:47`, `MyBookings.tsx:71`) without any runtime guard that those properties exist.

**Impact:** If the error is a non-`ErrorResponse` object (e.g., a network `Error` instance), `error.details` and `error.error` are both `undefined`, silently falling through to the generic message. The actual error information is lost.

---

### 3.5 — `MEDIUM` — `console.error` used for error reporting with no logging abstraction

**File:** `src/pages/Flights.tsx:52`; `src/pages/MyBookings.tsx:43`

**Description:** Two catch blocks call `console.error(error)` directly alongside `toast.error(...)`. There is no logging abstraction, log level control, or error-reporting integration (e.g., Sentry). `console.error` output is visible only in browser DevTools and is lost in production environments where the console is not monitored.

**Impact:** Production errors that hit these paths are invisible to operators. The `console.error` in other catch blocks is absent entirely (`BookingModal.tsx:46`, `UserIdentification.tsx:60`), making the logging coverage inconsistent.

---

### 3.6 — `MEDIUM` — `Booking.status` typed as union on frontend but unvalidated on receipt from API

**File:** `src/types/index.ts` · line 17`; `src/services/api.ts` · line 87`

**Description:** `Booking.status` is typed as `'booked' | 'cancelled' | 'completed'`, yet the backend's `BookingOut.status` field is a plain `str` with no server-side enum. The axios response is cast directly to `Booking[]` (`api.ts:88`) with no runtime validation. If the backend ever returns a status value outside the union (e.g., from a direct DB insert), TypeScript's type narrowing in `BookingCard.tsx` (lines 16–26) would silently fall through to the `default` case.

**Impact:** The type union gives a false sense of exhaustiveness. No runtime schema validation library (e.g., Zod) guards the API boundary.

---

### 3.7 — `MEDIUM` — `useEffect` in `UserProvider` writes to `localStorage` redundantly

**File:** `src/hooks/useUser.tsx` · lines 36–41

**Description:** `setUser()` (lines 23–30) already writes to `localStorage` synchronously. The `useEffect` at lines 36–41 also writes to `localStorage` whenever `user` changes. The two writes are redundant for the `setUser` path. On initial render with a stored user (loaded from `localStorage` on line 12), the `useEffect` fires with the loaded value and writes it back to `localStorage` unnecessarily.

**Impact:** Redundant writes are a minor inefficiency. More importantly, it obscures the single source of truth for when and how the session is persisted, making future modifications to session handling error-prone.

---

### 3.8 — `LOW` — `BookingCard` renders a Cancel button for `'completed'` and unknown statuses via `canCancel` logic

**File:** `src/components/bookings/BookingCard.tsx` · line 41

**Description:** `canCancel` is set to `booking.status === 'booked'`. This correctly suppresses the cancel button for `'cancelled'` and `'completed'` statuses. However, the `default` branch in `getStatusIcon()` and `getStatusColor()` (lines 23–24, 37–38) handles unknown status values silently, displaying a generic clock icon with no error indication.

**Impact:** If a status value outside the known three arrives from the API, the card renders in a visually ambiguous state with no cancellation option and no indication of the unknown status.

---

### 3.9 — `LOW` — No CSRF protection on state-mutating requests

**File:** `src/services/api.ts` · lines 77–101 (`bookFlight`, `cancelBooking`)

**Description:** `POST /book` and `POST /cancel/{id}` carry no CSRF token. The axios instance sends only `Content-Type: application/json`, which is a non-simple content type and therefore subject to CORS preflight — providing partial CSRF mitigation — but no explicit CSRF token mechanism exists. Combined with the wildcard CORS policy on the backend, the protection is incomplete.

**Impact:** Low severity in the current architecture (no cookies, no session tokens), but any future addition of cookie-based auth would require retrofitting CSRF protection.

---

## 4. Java Inventory Hold Service Findings

### 4.1 — `HIGH` — Service has no source code; described capability does not exist

**File:** `booking_system_inventory_hold_service/pom.xml` · lines 24–28

**Description:** The `pom.xml` describes the service as: *"Short-lived seat-hold microservice. Reserves seats on a flight for a configurable TTL window so that the booking service can complete payment without a race condition on seats_available."* No Java source files exist under any path within the module directory. The `src/main/java/com/galaxium/holdservice` path referenced in the task does not exist. The seat-hold race condition identified in finding 2.2 therefore has no mitigation.

**Impact:** The architectural intent documented in the POM — eliminating the race condition on `seats_available` — is entirely unimplemented. The backend performs unguarded read-modify-write on `seats_available` with no hold mechanism.

---

### 4.2 — `LOW` — `spring-cloud.version` property declared but no Spring Cloud dependencies present

**File:** `booking_system_inventory_hold_service/pom.xml` · line 33

**Description:** `<spring-cloud.version>2023.0.1</spring-cloud.version>` is declared in the `<properties>` block, but no Spring Cloud BOM import or dependency references it anywhere in the POM. The property is unused.

**Impact:** Dead configuration. If Spring Cloud dependencies are added later without referencing the BOM, version conflicts may arise silently.

---

*Audit generated from direct source file analysis — no speculative findings.*
