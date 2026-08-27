# Security Audit Findings — Galaxium Travels

| Field | Value |
|---|---|
| **Date** | 2025-07-14 |
| **Standard** | OWASP ASVS Level 1 |
| **Scope** | `booking_system_backend/` · `booking_system_frontend/` |
| **Auditor** | Bob (AI Security Analyst) |

**Scope summary:** REST API (FastAPI), MCP surface (FastMCP), React/TypeScript
frontend. Covers access control, authentication, session management, input
validation, API security, and HTTP security headers.

---

## Section 1 — Access Control (V4.1 & V4.2)

> Controls: V4.1.3, V4.1.5, V4.2.1

**V4.1.5** — FAIL
**V4.1.3** — FAIL
**V4.2.1** — FAIL

---

**Finding 1:**
- Rule: ASVS V4.1.5 — Access control denies by default
- Severity: Critical
- File: `booking_system_backend/server.py`
- Line: 133–178
- Issue: No authentication middleware, token dependency, or session guard is applied to any route; every endpoint is fully accessible to unauthenticated callers.
- Fix: Introduce a bearer-token or session-cookie auth dependency and apply it via `Depends()` to all non-public routes.

---

**Finding 2:**
- Rule: ASVS V4.1.3 — Users can only access their own resources
- Severity: Critical
- File: `booking_system_backend/server.py`
- Line: 154–157 (`GET /bookings/{user_id}`), 160–166 (`POST /cancel/{booking_id}`)
- Issue: Both the bookings-retrieval and booking-cancellation routes accept a resource identifier in the path and return or mutate the resource without verifying that the caller owns it.
- Fix: After establishing an authenticated session, compare the authenticated user's identity against the resource owner before returning data or performing mutations.

---

**Finding 3:**
- Rule: ASVS V4.2.1 — IDOR protection on predictable object IDs
- Severity: Critical
- File: `booking_system_backend/models.py`
- Line: 8 (`user_id`), 24 (`booking_id`)
- Issue: Both `user_id` and `booking_id` are auto-incremented sequential integers; without an ownership check an attacker can enumerate all users' bookings by incrementing the ID in the path parameter.
- Fix: Enforce resource ownership checks at the service layer so that a valid session is required and the session's user identity must match the resource owner; optionally use non-sequential opaque identifiers (e.g. UUIDs).

---

## Section 2 — Authentication & Session Management

> Extension of V4.1.5 — credential verification and session storage

**Auth credential check** — FAIL
**Session storage safety** — FAIL

---

**Finding 4:**
- Rule: ASVS V4.1.5 — Authentication credential verification
- Severity: Critical
- File: `booking_system_backend/services/user.py`, `booking_system_backend/models.py`
- Line: `user.py:23–25`, `models.py:6–10`
- Issue: The `User` model has no password column; the login flow is a plain database lookup by name and email with no secret credential, meaning anyone who knows or guesses a user's name and email gains full account access.
- Fix: Add a hashed password field to the `User` model and verify the submitted password against the stored hash (e.g. using `bcrypt`) before returning user data.

---

**Finding 5:**
- Rule: ASVS V4.1.5 — Session token exposure
- Severity: High
- File: `booking_system_frontend/src/hooks/useUser.tsx`
- Line: 12, 26–27
- Issue: The full user object (including `user_id`, `name`, and `email`) is stored unencrypted in `localStorage`, which is accessible to any JavaScript running on the page; a single XSS vulnerability would allow complete session theft.
- Fix: Replace `localStorage` persistence with an `HttpOnly` session cookie issued by the server after successful authentication; the frontend should never hold the raw user identity in JavaScript-accessible storage.

---

## Section 3 — Input Validation (V5.1)

> Controls: V5.1.1

**V5.1.1** — FAIL

---

**Finding 6:**
- Rule: ASVS V5.1.1 — String inputs have defined maximum length
- Severity: Medium
- File: `booking_system_backend/schemas.py`
- Line: 36–37 (`UserRegistration.name`), 37 (`UserRegistration.email`)
- Issue: The `UserRegistration` schema accepts `name` and `email` as unbounded strings; there is no `max_length` constraint, allowing arbitrarily long values to be written to the database.
- Fix: Apply `Field(max_length=100)` (or similar) to `name` and `Field(max_length=254)` to `email` (per RFC 5321) in the `UserRegistration` schema.

---

**Finding 7:**
- Rule: ASVS V5.1.1 — String inputs have defined maximum length
- Severity: Medium
- File: `booking_system_backend/schemas.py`
- Line: 19 (`BookingRequest.name`)
- Issue: The `BookingRequest.name` field used for name-matching during booking has no maximum length constraint.
- Fix: Apply `Field(max_length=100)` to `BookingRequest.name` to match any constraint applied to `UserRegistration.name`.

---

**Finding 8:**
- Rule: ASVS V5.1.1 — String inputs have defined maximum length
- Severity: Medium
- File: `booking_system_backend/server.py`
- Line: 176
- Issue: The `GET /user` endpoint accepts `name` and `email` as bare query string parameters with no Pydantic wrapper and no length constraint, bypassing schema-level validation entirely.
- Fix: Wrap the query parameters in a Pydantic model or apply `Query(max_length=...)` annotations so FastAPI enforces length limits before the values reach service logic.

---

## Section 4 — API Security & HTTP Headers (V13.1 & V14.4 & V14.5)

> Controls: V13.1.3, V14.4.1, V14.5.3

**V13.1.3** — FAIL
**V14.5.3** — FAIL
**V14.4.1** — FAIL

---

**Finding 9:**
- Rule: ASVS V13.1.3 — API credentials and PII not in URL query parameters
- Severity: High
- File: `booking_system_backend/server.py`
- Line: 176–178
- Issue: The `GET /user` endpoint transmits the user's name and email address as plaintext URL query parameters (`?name=...&email=...`); these values are recorded in server access logs, browser history, proxy logs, and `Referer` headers, exposing PII outside the application's control.
- Fix: Change `GET /user` to a `POST` endpoint that accepts name and email in the request body, or use a header-based lookup; remove PII from the URL entirely.

---

**Finding 10:**
- Rule: ASVS V14.5.3 — CORS origin validated against explicit allowlist
- Severity: High
- File: `booking_system_backend/server.py`
- Line: 124–130
- Issue: `CORSMiddleware` is configured with `allow_origins=["*"]` and `allow_credentials=True`; this allows any origin to make credentialed cross-origin requests to the API, enabling cross-site request forgery from any domain.
- Fix: Replace `allow_origins=["*"]` with an explicit list of trusted origins (e.g. `["http://localhost:5173", "https://galaxium.example.com"]`); `allow_credentials=True` is only safe alongside a specific origin allowlist.

---

**Finding 11:**
- Rule: ASVS V14.4.1 — HTTP responses include security headers
- Severity: Medium
- File: `booking_system_backend/server.py`
- Line: 117–130
- Issue: The FastAPI application does not set any HTTP security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`); browsers will apply permissive defaults, enabling clickjacking, MIME-sniffing, and downgrade attacks.
- Fix: Add a custom middleware (e.g. using `starlette.middleware.base.BaseHTTPMiddleware`) or integrate a library such as `secure` to inject the required security headers on every response.

---

## Summary

| Metric | Count |
|---|---|
| Total ASVS controls checked | 7 |
| PASS | 0 |
| FAIL | 7 |
| N/A | 0 |
| Total findings generated | 11 |

**Critical findings:** 3 (Findings 1, 2, 4)
**High findings:** 3 (Findings 3, 5, 9, 10)
**Medium findings:** 4 (Findings 6, 7, 8, 11)

### Security Posture Assessment

The Galaxium Travels application fails every ASVS Level 1 control checked: there is no authentication system, no authorization enforcement, no input length bounds, no security headers, and a fully open CORS policy — meaning any unauthenticated caller on any origin can read, modify, or cancel any user's bookings by guessing sequential integer IDs. The application should not be exposed to untrusted networks until at minimum Findings 1–5 (Critical and High access-control and authentication issues) have been remediated.
