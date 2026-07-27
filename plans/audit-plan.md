# Security Audit Plan — Galaxium Travels

## Overview

This plan executes a structured OWASP ASVS Level 1 security audit against the
highest-risk areas identified during the initial security exploration. The audit
covers the FastAPI backend (`booking_system_backend/`) and the React/TypeScript
frontend (`booking_system_frontend/`). Each sub-task maps to one ASVS control
category and produces discrete, independently reviewable findings.

All findings are written to `security/audit-findings.md`. The `security/`
directory must be created if it does not already exist.

### Scope

- Access control and authorization (IDOR, unauthenticated access)
- Authentication and session management
- Input validation and field length constraints
- API security (credentials in URLs, CORS)
- HTTP security headers

### Non-Goals

- Remediation / fixing vulnerabilities (audit only)
- SARIF or OSCAL report generation
- Penetration testing or runtime exploitation

### Guiding Skill

Each sub-task follows the phases defined by the `asvs-audit` skill:
Phase 1 Discover → Phase 2 Audit → Phase 3 Generate Findings → Phase 4 Summary.

---

## Sub-Task 1 — Bootstrap: Create Output File

**Status:** [x] done

**Intent:**
Create the `security/` directory and initialize `security/audit-findings.md`
with a title, date, and section headings so subsequent sub-tasks can append
their findings in a consistent format.

**Expected Outcomes:**
- `security/audit-findings.md` exists with a standard header
- Section placeholders for each audit area are present so findings can be
  appended in order

**Todo List:**
1. Create `security/audit-findings.md` with the following top-level structure:
   - Title: `# Security Audit Findings — Galaxium Travels`
   - Metadata block: date, audit standard (OWASP ASVS Level 1), scope summary
   - Section heading for each audit sub-task (Sub-Tasks 2–6)
   - A `## Summary` section at the end (to be filled by Sub-Task 6)

**Relevant Context:**
- Output file path: `security/audit-findings.md`
- No existing `security/` directory — must be created

---

## Sub-Task 2 — Audit: Access Control (V4.1 & V4.2)

**Status:** [x] done

**Intent:**
Audit ASVS controls V4.1.3, V4.1.5, and V4.2.1 — covering default-deny
access, user-scoped resource access, and IDOR protection on booking/user
endpoints.

**Expected Outcomes:**
- PASS/FAIL verdict recorded for V4.1.3, V4.1.5, V4.2.1
- File paths and line numbers recorded for every FAIL
- Structured findings appended to `security/audit-findings.md`
  under the Access Control section

**Todo List:**
1. **Discover** — read the following files to understand authorization flow:
   - `booking_system_backend/server.py` (route definitions)
   - `booking_system_backend/services/booking.py` (booking/cancel logic)
   - `booking_system_backend/services/user.py` (user lookup logic)
2. **Audit V4.1.5** — check whether any route rejects unauthenticated requests
   by default. Look for auth middleware, `Depends()` guards, or token checks.
3. **Audit V4.1.3** — check `GET /bookings/{user_id}` and
   `POST /cancel/{booking_id}`: does the handler verify the caller owns
   the resource before returning or mutating it?
4. **Audit V4.2.1** — check whether `user_id` and `booking_id` path parameters
   are sequential integers with no ownership enforcement (classic IDOR pattern).
5. **Generate findings** — write each FAIL to the Access Control section of
   `security/audit-findings.md` using the standard Finding format.

**Relevant Context:**
- `booking_system_backend/server.py` lines 154–166 — `GET /bookings/{user_id}`
  and `POST /cancel/{booking_id}` with no auth guard
- `booking_system_backend/services/booking.py` — `cancel_booking` accepts any
  `booking_id` with no caller identity check
- `booking_system_backend/services/user.py` — `get_user` is a plain DB lookup
  with no session token
- Primary keys are sequential auto-incremented integers (see `models.py`)

---

## Sub-Task 3 — Audit: Authentication & Session Management

**Status:** [x] done

**Intent:**
Audit the authentication mechanism (name+email lookup as "login") and the
frontend session storage strategy against ASVS access control defaults.
This is treated as an extension of V4.1.5 from the session/client perspective.

**Expected Outcomes:**
- PASS/FAIL verdict for the absence of any credential verification mechanism
- PASS/FAIL verdict for the use of `localStorage` for session persistence
  (XSS exposure)
- Structured findings appended to `security/audit-findings.md`
  under the Authentication & Session section

**Todo List:**
1. **Discover** — read:
   - `booking_system_backend/services/user.py` — the `get_user` function is
     the entire auth mechanism
   - `booking_system_frontend/src/hooks/useUser.tsx` — how session is stored
   - `booking_system_frontend/src/components/user/UserIdentification.tsx` —
     the login/register form
2. **Audit** — verify there are no passwords, tokens, or cryptographic checks
   anywhere in the login flow. Confirm `user_id`, `name`, and `email` are
   stored in plain `localStorage`.
3. **Generate findings** — write structured findings for:
   - Lack of any authentication credential (password/token)
   - Session data stored in `localStorage` (accessible to JavaScript / XSS risk)

**Relevant Context:**
- `booking_system_backend/services/user.py:23-25` — `get_user` is a filter by
  name + email; no password or secret involved
- `booking_system_frontend/src/hooks/useUser.tsx:12` — `localStorage.getItem`
  and `localStorage.setItem` with full user object including `user_id`

---

## Sub-Task 4 — Audit: Input Validation (V5.1)

**Status:** [x] done

**Intent:**
Audit V5.1.1 — verify that all string input fields have a defined maximum
length constraint at the schema/validation layer.

**Expected Outcomes:**
- PASS/FAIL verdict for each string field in the Pydantic schemas
- Structured findings appended to `security/audit-findings.md`
  under the Input Validation section

**Todo List:**
1. **Discover** — read:
   - `booking_system_backend/schemas.py` — all Pydantic models
   - `booking_system_backend/server.py` — `GET /user` query params (`name`,
     `email`) which are not wrapped in a Pydantic model
2. **Audit V5.1.1** — for every `str` field in every schema, check whether
   `max_length` is defined via `Field(max_length=...)` or a `constr` type.
   Also check raw query parameters on `GET /user`.
3. **Generate findings** — list each unvalidated field as a separate FAIL entry.

**Relevant Context:**
- `booking_system_backend/schemas.py` — `BookingRequest.name`,
  `UserRegistration.name`, `UserRegistration.email` (EmailStr validates format
  but not length), `FlightOut` string fields
- `booking_system_backend/server.py:176` — `GET /user` accepts `name: str` and
  `email: str` as bare query parameters with no length constraint

---

## Sub-Task 5 — Audit: API Security & HTTP Headers (V13.1 & V14.4 & V14.5)

**Status:** [x] done

**Intent:**
Audit V13.1.3 (credentials/PII in URL query params), V14.4.1 (HTTP security
headers), and V14.5.3 (CORS wildcard origin) against the FastAPI middleware
and route configuration.

**Expected Outcomes:**
- PASS/FAIL verdict for V13.1.3, V14.4.1, V14.5.3
- Structured findings appended to `security/audit-findings.md`
  under the API Security & HTTP Headers section

**Todo List:**
1. **Discover** — read:
   - `booking_system_backend/server.py` — CORS middleware config and
     `GET /user` route signature
2. **Audit V13.1.3** — check whether `GET /user?name=...&email=...` transmits
   PII (name, email) as URL query parameters, which appear in server logs,
   browser history, and referrer headers.
3. **Audit V14.5.3** — inspect the `CORSMiddleware` call: check
   `allow_origins`, `allow_credentials`, `allow_methods`, `allow_headers`
   for wildcard values.
4. **Audit V14.4.1** — check whether FastAPI adds any security headers
   (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
   `Strict-Transport-Security`). FastAPI does not add these by default.
5. **Generate findings** — write one structured finding per FAIL.

**Relevant Context:**
- `booking_system_backend/server.py:124-130` — `allow_origins=["*"]` with
  `allow_credentials=True`
- `booking_system_backend/server.py:176-178` — `GET /user` exposes `name` and
  `email` as query params
- FastAPI does not set `X-Frame-Options`, `CSP`, or `X-Content-Type-Options`
  unless explicitly configured via middleware

---

## Sub-Task 6 — Compile Summary

**Status:** [x] done

**Intent:**
Aggregate all findings from Sub-Tasks 2–5 into a final summary section in
`security/audit-findings.md`, including total control counts, pass/fail/N/A
tallies, and a two-sentence overall security posture assessment.

**Expected Outcomes:**
- `security/audit-findings.md` `## Summary` section is complete
- Overall counts are accurate across all controls checked
- The document is self-contained and ready for review

**Todo List:**
1. Read `security/audit-findings.md` in full.
2. Count total controls checked, and tally PASS, FAIL, N/A across all sections.
3. Write a two-sentence security posture assessment.
4. Fill in the `## Summary` section with the final counts and assessment.
5. Confirm the document is complete and well-formed.

**Relevant Context:**
- Controls audited: V4.1.3, V4.1.5, V4.2.1, V5.1.1, V13.1.3, V14.4.1,
  V14.5.3 — 7 controls total across 4 categories
- Output: `security/audit-findings.md`
