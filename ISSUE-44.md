# Issue #44: Calendar export (.ics) for bookings

- **URL:** https://github.com/IBM/galaxium-travels/issues/44
- **State:** open
- **Author:** Max-Jesch
- **Created:** 2026-04-17T12:54:50Z
- **Labels:** enhancement, roadmap, tier-3, area/fullstack
- **Comments:** 0

---

> Tier 3, item 20 of the [Product Backlog](https://github.com/IBM/galaxium-travels/blob/main/README.md#-product-backlog).

`GET /bookings/{id}.ics` endpoint + "Add to calendar" button on the trip detail page.

### Gap
A real-world integration users actually use. Missing from My Bookings today.

### Scope
- Backend endpoint returns a valid iCalendar file with VEVENT for departure.
- Add-to-calendar button inside `BookingCard.tsx` (alongside the Cancel button, gated on `status === 'booked'`).
- **Out of scope:** Google Calendar deep-links, multi-VEVENT itineraries for multi-leg trips.

### Touches
- `booking_system_backend/services/booking.py` — new service functions
- `booking_system_backend/server.py` — new endpoint + matching MCP tool
- `booking_system_backend/tests/` — unit + REST tests
- `booking_system_frontend/src/components/bookings/BookingCard.tsx` — "Add to Calendar" button

### Implementation notes
- No third-party library needed — iCalendar is a plain-text format (RFC 5545).
- Endpoint returns `Content-Type: text/calendar` with `Content-Disposition: attachment`; 404 if booking not found.
- Frontend triggers download via a temporary `<a download>` element, not Axios.
- MCP tool must be added alongside the REST endpoint (project convention).

### Size
~1 hour

### Acceptance criteria
- [ ] `GET /bookings/{id}/export.ics` returns HTTP 200 with `Content-Type: text/calendar` and a valid iCalendar body
- [ ] `GET /bookings/{id}/export.ics` returns HTTP 404 when booking ID does not exist
- [ ] Event contains `SUMMARY`, `LOCATION` (origin → destination), `DTSTART`, `DTEND`, `DESCRIPTION`, `UID`
- [ ] Matching MCP tool added alongside the REST endpoint
- [ ] "Add to Calendar" button on active booking cards triggers a browser file download
- [ ] File opens correctly in Apple Calendar and Google Calendar
- [ ] `cd booking_system_backend && pytest` passes with new tests included


Note: Ensure the backend is running with real seed data before demoing — flight times are stored in ISO 8601 format (2099-01-01T09:00:00Z) and the calendar export handles this correctly.
