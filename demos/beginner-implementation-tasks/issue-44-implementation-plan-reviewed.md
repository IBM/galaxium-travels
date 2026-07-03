# Issue #44 — Calendar Export (.ics) for Bookings

**Status:** Draft · Reviewed

## Summary

The frontend download URL will use `(import.meta.env.VITE_API_URL || '/api')` as base — consistent with the existing `api.ts` pattern and proxy-safe in both dev and production. The "Add to Calendar" button will be shown on all booking cards but disabled for non-`booked` statuses, preserving visual layout consistency. The service test for the `.ics` output will include an explicit `assert '\r\n' in result` assertion to guard against silent CRLF regression.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend download URL base | `(import.meta.env.VITE_API_URL \|\| '/api') + '/bookings/{id}/export.ics'` | Consistent with `api.ts`; works via Vite proxy in dev and direct in production without extra config. |
| "Add to Calendar" visibility for cancelled bookings | Show disabled button | Preserves card layout consistency; disabled state signals unavailability without removing the affordance entirely. |
| CRLF assertion in service tests | Assert `'\r\n' in result` in `test_get_booking_ics_returns_valid_icalendar` | RFC 5545 is strict about line endings; an explicit assertion catches silent regressions cheaply. |

---

## Open Items

- **Datetime format variance:** Seed data uses both `"2099-01-01T09:00:00Z"` (ISO 8601) and `"2099-01-01 09:00"` (space-separated). The `get_booking_ics()` implementation must normalise both via `datetime.fromisoformat()` with Z-stripping — confirm test fixtures cover both formats.
- **MCP tool placement:** New `@mcp.tool()` must be defined before `mcp_app = mcp.http_app()` at line 108 of `server.py`. Any future refactors that reorder that file risk silent tool-registration failure.
- **Calendar client compatibility:** RFC 5545 compliance (CRLF, PRODID, VERSION) is the primary compatibility guarantee. Real-world smoke test in Apple Calendar / Google Calendar is listed in acceptance criteria but not automated — worth a manual check before closing the issue.
- **Button disabled state styling:** The plan specifies `variant="secondary"` but does not specify how disabled looks in the existing `<Button>` component — confirm the component handles `disabled` prop visually before shipping.

---

## Next Steps

1. Add `get_booking_ics(db, booking_id)` service function to `booking_system_backend/services/booking.py` — return `str | ErrorResponse`, build iCalendar string with CRLF, handle both ISO datetime formats.
2. Add `GET /bookings/{booking_id}/export.ics` REST endpoint to `server.py` — return `Response(content=ics_str, media_type="text/calendar")` with `Content-Disposition` header; raise `HTTPException(404)` on error.
3. Add `@mcp.tool() get_booking_ics(booking_id: int) -> str` to `server.py` — above `mcp_app = mcp.http_app()` (line 108).
4. Add `handleAddToCalendar` handler and "Add to Calendar" button to `BookingCard.tsx` — use `(import.meta.env.VITE_API_URL || '/api')` base URL; show button for all statuses, disable when `booking.status !== 'booked'`; use `CalendarPlus` icon from `lucide-react`.
5. Add `TestBookingIcsService` class to `test_services.py` — assert all required iCalendar fields **and** `'\r\n' in result`.
6. Add `TestIcsEndpoint` class to `test_rest.py` — assert HTTP 200 / `text/calendar` / `BEGIN:VCALENDAR` for valid ID, HTTP 404 for unknown ID.
7. Run `cd booking_system_backend && pytest` — confirm all tests pass.
8. Manual smoke test: download `.ics` from the UI and open in Apple Calendar or Google Calendar.
