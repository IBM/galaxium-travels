# Galaxium Travels — Stakeholder Audit Report

**Classification:** Internal — Restricted  
**Prepared by:** Engineering Audit  
**Audit period:** Current codebase state (branch: `bob-learning-path-branch`)  
**Source documents:** [Code Quality Summary](code-quality-summary.md) · [Dependency Audit](dependency-audit.md) · [Technical Debt Assessment](technical-debt-assessment.md) · [Compliance & Documentation Review](compliance-documentation.md)

---

## 1. Executive Summary

The Galaxium Travels booking platform is a functional demonstration system consisting of a Python/FastAPI backend, a React/TypeScript frontend, and a scaffolded Java/Spring Boot inventory hold service. In its current state the system successfully implements the core booking workflow and maintains a consistent internal architecture. However, a structured audit across code quality, dependency health, technical debt, and compliance dimensions has identified **38 technical debt items** (7 Critical, 15 High) and **28 code-quality findings** (3 Critical, 9 High) that collectively prevent the system from being considered production-ready without remediation.

The most critical risks centre on three interconnected concerns. First, the system has **no authentication or authorisation layer** of any kind — any actor can create, read, or cancel any booking by supplying a name and email address, and all user state persists in `localStorage` without any server-side session validation. Second, there is **no application-level logging or audit trail**; no backend module imports a logging framework, meaning all operational events, error conditions, and security-relevant actions are permanently unobservable in production. Third, a **read-check-write race condition** in the seat-reservation path is unguarded by any database transaction or lock, making double-booking a realistic failure mode under concurrent load.

Recommended remediation should be sequenced to address the authentication gap and data integrity risk first, as downstream compliance and operational controls cannot be meaningfully evaluated until those foundations are in place. The dependency pinning gap and missing CI/CD pipeline represent a parallel track of work that can begin immediately and is relatively low in engineering effort. Detailed findings, effort estimates, and affected components are provided in the source audit documents referenced above; this report consolidates the highest-priority items for stakeholder review and decision-making.

---

## 2. Production Readiness Scorecard

| Dimension | Status | Rationale |
|---|:---:|---|
| **Authentication & Authorisation** | 🔴 Red | No server-side auth exists; user identity is a name/email lookup with no session, token, or role enforcement |
| **Data Protection** | 🔴 Red | Email transmitted as a plain URL query parameter; no encryption at rest; seed wipes all data on every startup |
| **Observability** | 🔴 Red | Zero application-level logging in any backend module; all HTTP errors return 200; no metrics or tracing |
| **Dependency Health** | 🟡 Amber | Frontend lockfile is current; backend `requirements.txt` is fully unpinned with no lock file; Java service not yet implemented |
| **Test Coverage** | 🟡 Amber | Backend has a meaningful REST and service-layer test suite with good fixture isolation; frontend has no tests; coverage is not measured |
| **Operational Readiness** | 🔴 Red | No CI/CD pipeline; no migration tooling; no health-check endpoint; `seed()` destroys all data unconditionally on startup |

---

## 3. Critical and High Findings

The table below consolidates Critical and High findings from all four source audits. Refer to the individual documents for full descriptions, reproduction steps, and remediation guidance.

| # | Source | Category | Finding | Affected Component | Effort |
|---|---|---|---|---|---|
| 1 | Debt / Compliance | Authentication | No authentication or authorisation layer | Entire system | Large |
| 2 | Debt / Quality | Data Integrity | Unguarded race condition on `seats_available` — double-booking possible | `services/booking.py` | Medium |
| 3 | Debt / Compliance | Observability | No application-level logging in any backend module | All backend modules | Medium |
| 4 | Debt | Operational | `seed()` destroys all data unconditionally on every startup | `seed.py`, `server.py` | Small |
| 5 | Debt | Operational | No CI/CD pipeline — no automated build, test, or deploy | Repository root | Large |
| 6 | Debt | Operational | No database migration tooling (Alembic absent) | `db.py`, `models.py` | Medium |
| 7 | Compliance | Data Protection | Email transmitted as plaintext URL query parameter | `GET /user`, frontend API layer | Small |
| 8 | Debt / Quality | Dependencies | Backend `requirements.txt` fully unpinned; no lock file | `requirements.txt` | Small |
| 9 | Quality | Error Handling | All endpoints return HTTP 200 regardless of outcome | `server.py` — all route handlers | Medium |
| 10 | Quality | Code Quality | `isErrorResponse` typed `any` — bypasses TypeScript safety | `src/services/api.ts` | Small |
| 11 | Debt | Architecture | Inventory hold service is a `pom.xml` scaffold only — no source code | `booking_system_inventory_hold_service/` | Large |
| 12 | Compliance | Documentation | Copyright placeholder in `LICENSE` is unfilled | `LICENSE` | Trivial |
| 13 | Debt | Architecture | No `docker-compose.yml` — multi-service local development is manual | Repository root | Small |
| 14 | Quality | Testing | Frontend has no test suite; `npm run build` is the only integration check | `booking_system_frontend/` | Large |
| 15 | Debt | Architecture | No health-check or readiness endpoint on the backend | `server.py` | Small |

> **Note:** Items 1–8 correspond to Critical-severity findings in the source documents. Items 9–15 are High severity. For the full set of Medium and Low findings see the individual audit documents.

---

## 4. Recommended Remediation Sequence

The following ordering is recommended based on blast radius, dependency relationships between fixes, and implementation effort.

| Priority | Item | Rationale |
|:---:|---|---|
| 1 | **Introduce authentication (JWT or session-based)** | All access-control and compliance controls are blocked until a verified identity exists; this is the single largest gap |
| 2 | **Fix the seats race condition with a database transaction** | Data integrity risk is independent of auth and can cause silent data corruption under any realistic load; low effort relative to impact |
| 3 | **Add structured application logging** | Without a logging framework, production incidents are undiagnosable and the audit trail required for compliance (GDPR, SOC 2) does not exist |
| 4 | **Pin all backend dependencies and introduce a CI pipeline** | Unpinned dependencies make every fresh install a gamble; a CI pipeline gates these and all future changes, compounding value over time |
| 5 | **Correct HTTP status codes and move email off the URL query string** | Both are externally observable protocol violations that affect API consumers, monitoring tools, and compliance posture; both are small-effort changes |

---

## 5. Positive Findings

The following controls and practices are well-implemented and should be preserved through remediation work.

- **Pydantic `EmailStr` validation** is applied on `POST /register`, providing server-side format enforcement for the most sensitive user input field.
- **Consistent service-layer error handling** — all service functions return `ErrorResponse` on failure rather than raising exceptions, providing a single, predictable contract for callers.
- **Frontend `package-lock.json`** is present and up to date (lockfileVersion 3), giving the Node dependency graph a reproducible baseline.
- **Spring Boot BOM** in `pom.xml` provides exact transitive version pinning for the Java service, the correct approach for that ecosystem.
- **Backend test fixture isolation** — `db_session` gives each test a fresh in-memory SQLite schema; `conftest.py` correctly patches both `server.SessionLocal` and `db.SessionLocal`.
- **TypeScript strict mode** (`strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`) is enabled, catching a broad class of type errors at compile time.
- **All Node production dependencies** carry permissive licenses (MIT or ISC), fully compatible with the project's Apache-2.0 license.
- **FastAPI auto-generates an OpenAPI specification** at `/docs`, providing an always-current API reference without manual maintenance.
- **`isErrorResponse` helper** in `src/services/api.ts` establishes a single discriminant point for union response handling across the entire frontend service layer.

---

*For detailed findings, reproduction steps, and remediation guidance refer to the source audit documents linked at the top of this report.*

---

<sub>Galaxium Travels — Internal Audit · Engineering · Restricted distribution</sub>
