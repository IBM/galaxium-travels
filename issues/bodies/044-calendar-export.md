`GET /bookings/{id}/export.ics` endpoint and an "Add to calendar" button on each active boarding pass.

### Gap
A real-world integration travellers actually use. My Bookings has no way to get a trip into a calendar.

### Scope
- Backend endpoint returns a valid iCalendar file with one VEVENT for the flight.
- "Add to calendar" button on the boarding pass, next to "Cancel booking" and shown under the same condition.
- **Out of scope:** Google Calendar deep-links, several events for multi-leg trips.

### Touches
- `booking_system_backend/services/booking.py`
- `booking_system_backend/server.py`
- `booking_system_backend/tests/test_rest.py`
- `booking_system_backend/tests/test_services.py`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`

### Size
S · frontend and Python backend · about 5 files, under 200 lines. No schema change.

### Implementation notes
- No third-party library needed — iCalendar is a plain-text format (RFC 5545).
- The endpoint returns `Content-Type: text/calendar` with `Content-Disposition: attachment`, and 404 if the booking does not exist.
- The frontend triggers the download through a temporary `<a download>` element, not Axios.
- Place the route above the `FastApiMCP(app)` call in `server.py`. The MCP tool is generated from it.
- Departure times come in two formats: test fixtures use `"YYYY-MM-DD HH:MM"`, the seeded database uses ISO 8601 (`2099-01-01T09:00:00Z`). The export has to handle both.

### Acceptance criteria
- [ ] `GET /bookings/{id}/export.ics` returns HTTP 200 with `Content-Type: text/calendar` and a valid iCalendar body
- [ ] `GET /bookings/{id}/export.ics` returns HTTP 404 when the booking does not exist
- [ ] The event contains `SUMMARY`, `LOCATION` (origin → destination), `DTSTART`, `DTEND`, `DESCRIPTION`, `UID`
- [ ] "Add to calendar" on an active boarding pass downloads the file
- [ ] The file opens correctly in Apple Calendar and Google Calendar
- [ ] At least one test uses the timestamp format from `seed.py`

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_frontend && npm run lint && npm run build
```
