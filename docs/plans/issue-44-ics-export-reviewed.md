# Issue #44 — Calendar Export (.ics) for Bookings — Reviewed Plan

**Status:** Draft · Reviewed  
**Branch:** `feature/44-ics-export`  
**Est.:** ~1 hour

## Summary

The ICS export plan is solid and ready to implement with three targeted amendments: the "Add to Calendar" button will appear on all non-cancelled bookings (independent of the Cancel button gate), the frontend download handler will use the simpler direct `<a href>` approach since the nginx proxy handles routing correctly in production, and the ICS body will use RFC 5545-compliant `\r\n` line endings throughout for enterprise calendar client compatibility.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend button gate | `booking.status !== 'cancelled'` — independent of the Cancel button | Completed trips are still valid calendar events worth exporting; tying it to `canCancel` would silently hide it for `'completed'` bookings |
| ICS download handler | Direct `<a href>` approach (no fetch/blob) | Simpler code; nginx proxy in production correctly routes `/api` to the backend, so same-origin `Content-Disposition` restrictions don't apply |
| ICS line endings | `\r\n` (RFC 5545-compliant) | Two-character swap; keeps the output valid for enterprise clients (Exchange, Outlook) in addition to the stated AC targets (Apple Calendar, Google Calendar) |

## Open Items

- The plan notes "file opens correctly in Apple Calendar and Google Calendar" as an AC item — manual verification required post-implementation; automated tests cannot assert this.
- `\r\n` throughout means the Python unit test assertions should use `assertIn("BEGIN:VCALENDAR", result)` — test must not split on `\n` alone or it will fail on Windows-style content.
- Confirm that the nginx `location /api/` block in the Docker image forwards all response headers (including `Content-Disposition`) without stripping them; worth a one-off manual curl smoke test in Docker.

## Next Steps

1. Add `get_booking_ics()` to `booking_system_backend/services/booking.py` — use `\r\n` as the ICS line separator; parse flight times with `datetime.strptime(t, "%Y-%m-%d %H:%M")`.
2. Add REST endpoint `GET /bookings/{id}/export.ics` to `server.py` — import `Response` from `fastapi.responses`; return `text/calendar` with `Content-Disposition: attachment`.
3. Add matching MCP tool `export_booking_ics(booking_id: int)` to `server.py` — follow the `SessionLocal` / `db.close()` pattern used by existing MCP tools.
4. Update `BookingCard.tsx` — add `canExport = booking.status !== 'cancelled'` gate; render "Add to Calendar" button using `variant="secondary"` + `CalendarPlus` icon from `lucide-react`; use direct `<a href>` download handler.
5. Add `TestBookingIcsService` to `test_services.py` — three cases: valid returns `str` starting with `BEGIN:VCALENDAR`, contains required fields, not-found returns `ErrorResponse`.
6. Add `TestBookingIcsEndpoint` to `test_rest.py` — two cases: 200 with correct headers, 404 for unknown ID.
7. Run `cd booking_system_backend && pytest` — all tests must pass.
8. Run `cd booking_system_frontend && npm run lint` — no new lint errors.
