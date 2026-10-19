# Plan Mode Architecture Rules

## Non-Obvious Architectural Constraints

- **Service boundary: frontend → Python backend only.** The Java hold service has no direct frontend access — all hold/quote interactions go through Python proxy endpoints. This is intentional; changing it requires adding CORS to Java too.
- **No DB migrations.** Schema is managed by SQLAlchemy `Base.metadata.create_all` on every startup. Adding columns requires manual DB deletion or an `ALTER TABLE` — there is no migration framework.
- **Java service confirms bookings by calling Python `/internal/bookings/from-hold`** — this is the only reverse call (Java → Python). Any change to the booking logic must consider this internal endpoint.
- **Hold expiry is environment-configurable** — `HOLD_DURATION_MINUTES` and `HOLD_EXPIRATION_CHECK_INTERVAL_SECONDS` are env vars. E2E tests override these to 1 min / 5 sec for the slow expiry test (`E2E_RUN_SLOW=1`).
- **PostgreSQL is production DB; SQLite is dev/test only.** The backend switches based on `DATABASE_URL` env var. The Java service always uses SQLite (no PostgreSQL support planned).
- **The `/flights` endpoint has dual filter API** — a "main branch" set of params (`sort`, `order`) coexists with a "feature branch" set (`sort_by`, `sort_order`, `seat_class`, etc.). Both are supported for backward compatibility. New filter work should add to the feature branch params.
- **No auth layer.** `user_id` + `name` matching is used for booking identity verification. This is a demo project constraint.
