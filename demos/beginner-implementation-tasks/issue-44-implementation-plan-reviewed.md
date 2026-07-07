# Issue #44 — Calendar Export (.ics) for Bookings — Reviewed

**Status:** Draft · Reviewed  
**Tier:** 3 · ~1 hour · Full-stack (backend + frontend)

---

## Summary

The plan is sound and ready to implement. Flight times are stored as UTC in the SQLite DB, so appending the literal `Z` suffix in the iCalendar output is correct. The `/api` prefix is already proxied in Vite dev and production, meaning the frontend `<a href="/api/bookings/…">` download link will work without changes. Test fixtures must create a `User` and `Flight` row before inserting a `Booking` due to FK constraints — the existing `TestBookingService` tests provide an exact pattern to follow.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timezone handling in iCalendar output | Append literal `Z` (UTC) suffix | Flight times are stored as UTC in the DB; no conversion needed. Matches RFC 5545 UTC-offset notation. |
| Frontend API path for .ics download | Use `/api/bookings/{id}/export.ics` relative path | The `/api` prefix is already proxied by Vite in dev and by nginx/routing in production — no absolute URL or env var needed. |
| Test fixture setup for ICS service tests | Create `User` + `Flight` + `Booking` inline per test | `Booking` has FK constraints on both `user_id` and `flight_id`; existing `TestBookingService` tests show the exact pattern to follow. |

---

## Open Items

- The plan spec does not include a `DTSTAMP` value in the example skeleton — implementers should use `datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")` for the current timestamp as required by RFC 5545.
- The acceptance criterion "File opens correctly in Apple Calendar and Google Calendar" cannot be validated by automated tests — manual smoke-test is required before closing the issue.
- No e2e test coverage is specified for the calendar export flow; consider adding a `test_smoke.py` assertion for the `Content-Type: text/calendar` header if e2e coverage of new endpoints is desired.
- `error_code` in the MCP tool references `result.details` — verify that `ErrorResponse` has a `details` field (the REST path only uses `result.error`).

---

## Next Steps

1. Add `export_booking_ics(db, booking_id) -> str | ErrorResponse` to `booking_system_backend/services/booking.py`, including `DTSTAMP` with current UTC time.
2. Add the REST endpoint `GET /bookings/{booking_id}/export.ics` to `server.py` (import `Response` from `fastapi`).
3. Add the matching MCP tool `export_booking_ics` to `server.py` before the `mcp_app = mcp.http_app()` line.
4. Add 2 service-level tests to `test_services.py` and 2 REST-level tests to `test_rest.py`, following the existing `TestBookingService` fixture pattern (User + Flight + Booking inline).
5. Add the "Add to Calendar" button to `BookingCard.tsx`, gated on `booking.status === 'booked'`, above the Cancel button.
6. Run `cd booking_system_backend && pytest` and `cd booking_system_frontend && npm run lint` to validate.
7. Manually open the downloaded `.ics` file in Apple Calendar and Google Calendar to satisfy the last acceptance criterion.

---

## Files Touched

| File | Change |
|------|--------|
| `booking_system_backend/services/booking.py` | + `export_booking_ics()` |
| `booking_system_backend/server.py` | + `export_booking_ics` MCP tool + REST endpoint |
| `booking_system_backend/tests/test_services.py` | + 2 service tests |
| `booking_system_backend/tests/test_rest.py` | + 2 REST tests |
| `booking_system_frontend/src/components/bookings/BookingCard.tsx` | + "Add to Calendar" button |
