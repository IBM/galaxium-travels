# ICS-EXPORT-PLAN: Calendar export (.ics) for bookings (Issue #44)

Source: [`ISSUE-44.md`](ISSUE-44.md)

## Overview

Add `GET /bookings/{booking_id}/export.ics` to the FastAPI backend. It returns an RFC 5545 iCalendar file with a single VEVENT for the booking's flight departure. Add an "Add to Calendar" button to `BookingCard.tsx` that downloads the file through a temporary `<a download>` element (not Axios).

Decisions confirmed with the user:
- The backend exports an `.ics` for **any existing booking** (booked, cancelled or completed). Only a missing booking returns 404.
- Only the UI button is gated on `booking.status === 'booked'`.
- Use the path from the acceptance criteria, `/bookings/{id}/export.ics`, not the `/bookings/{id}.ics` in the issue body.

Findings from code research that shape the plan:
- **MCP tools are auto-generated.** [`server.py`](booking_system_backend/server.py:336) calls `FastApiMCP(app)`, which exposes every FastAPI route as an MCP tool. There are no `@mcp.tool()` functions, and `SessionLocal` is not used in `server.py`. `AGENTS.md` and `demos/beginner-implementation-tasks/issue-44-implementation-plan.md` say otherwise, and both are wrong on this point. The new route must be defined **above** line 336 so it gets a matching MCP tool. Give it a docstring, because the docstring becomes the tool description.
- **Flight time formats are mixed.** [`seed.py`](booking_system_backend/seed.py:38) uses `2099-01-01T09:00:00Z`. Tests use `2099-01-01 09:00`. `Flight.departure_time` and `Flight.arrival_time` are plain `String` columns. The `.ics` builder must handle both formats.
- **Service functions return Union types.** The new service function returns `str | ErrorResponse`, and the endpoint checks `isinstance(result, ErrorResponse)` and raises `HTTPException(404, detail=result.model_dump())`. This matches `cancel_booking_endpoint`.
- **Route clash is not a concern.** `/bookings/{user_id}` has one path segment, so `/bookings/{booking_id}/export.ics` does not collide with it.
- **Frontend base URL.** [`api.ts`](booking_system_frontend/src/services/api.ts:14) uses `import.meta.env.VITE_API_URL || '/api'`, and the Vite dev proxy strips `/api`. The download URL must use the same base.
- **The frontend has no test framework.** Verify it with lint and a build, plus a manual check.

## Sub-Tasks

### 1. Backend service: build the iCalendar string
**Intent:** Put the .ics generation in the service layer, following the existing `services/booking.py` pattern.

**Expected Outcomes:**
- `booking.get_booking_ics(db, booking_id)` returns a valid iCalendar string for an existing booking, whatever its status.
- It returns `ErrorResponse(error_code="BOOKING_NOT_FOUND")` for an unknown booking.
- The event has `UID`, `SUMMARY`, `LOCATION` (origin → destination), `DTSTART`, `DTEND` and `DESCRIPTION`.

**Todo List:**
1. Add `get_booking_ics(db: Session, booking_id: int) -> str | ErrorResponse` to `services/booking.py`.
2. Look up the booking and return `BOOKING_NOT_FOUND` if it is missing. Then load its flight, using the same lookup style as `cancel_booking`.
3. Handle a missing flight row the same way existing functions do. Check `cancel_booking` for the precedent and reuse its error code.
4. Parse `departure_time` and `arrival_time` for both formats (`...T..:..:..Z` and `YYYY-MM-DD HH:MM`). Treat naive values as UTC. Output them as `YYYYMMDDTHHMMSSZ`.
5. Build the `VCALENDAR` with `VERSION:2.0`, `PRODID`, `CALSCALE:GREGORIAN` and a single `VEVENT`. Include `DTSTAMP`, because RFC 5545 requires it and Apple Calendar is strict about it.
6. Use a stable `UID` such as `booking-{booking_id}@galaxium-travels`. Put booking ID, flight ID, seat class and price paid in `DESCRIPTION`.
7. Escape text values (backslash, comma, semicolon, newline). Join lines with `\r\n`, end with a trailing CRLF, and fold lines longer than 75 octets.

**Relevant Context:**
- [`booking_system_backend/services/booking.py`](booking_system_backend/services/booking.py): `cancel_booking` and `get_bookings`
- [`booking_system_backend/models.py`](booking_system_backend/models.py): `Booking` and `Flight`
- [`booking_system_backend/schemas.py`](booking_system_backend/schemas.py): `ErrorResponse`
- [`booking_system_backend/seed.py`](booking_system_backend/seed.py): time format

**Status:** `[ ] pending`

---

### 2. Backend REST endpoint (and automatic MCP tool)
**Intent:** Expose the service over HTTP with the right headers. Adding the route also creates the matching MCP tool.

**Expected Outcomes:**
- `GET /bookings/{booking_id}/export.ics` returns 200 with `Content-Type: text/calendar` and `Content-Disposition: attachment; filename="booking-{id}.ics"`.
- An unknown booking returns 404 with the standard error detail.
- The route appears in the MCP tool list.

**Todo List:**
1. Add `Response` to the `fastapi` import in `server.py`.
2. Add the route after `cancel_booking_endpoint` and before the MCP section. Use `tags=["Bookings"]`.
3. Write a docstring that describes the endpoint for MCP agents. Give it an explicit `operation_id` if the auto-generated tool name would be unclear.
4. On `ErrorResponse`, raise `HTTPException(404, detail=result.model_dump())`.
5. On success, return `Response(content=ics, media_type="text/calendar", headers={...})`.
6. Confirm the route is registered before `FastApiMCP(app)` runs, so the tool is generated.
7. Check that the route does not break the other `/bookings/...` routes.

**Relevant Context:**
- [`booking_system_backend/server.py`](booking_system_backend/server.py): `cancel_booking_endpoint` (line 175) is the error-handling pattern. `FastApiMCP(app)` is at line 336.
- Footgun: the MCP server is created before the FastAPI app and the lifespan is composed. Do not reorder that code.

**Status:** `[ ] pending`

---

### 3. Backend tests
**Intent:** Cover the service and the REST endpoint, and check that the MCP tool exists. All checks must pass with `cd booking_system_backend && pytest`.

**Expected Outcomes:**
- Service tests and REST tests pass, with the existing suite still green.

**Todo List:**
1. In `tests/test_services.py`, add a test class for `get_booking_ics`. Cover:
   - a valid calendar with all required properties;
   - the ISO `Z` time format;
   - the space-separated time format;
   - a cancelled booking still exports;
   - a not-found booking returns `ErrorResponse` with `BOOKING_NOT_FOUND`;
   - CRLF line endings and `END:VCALENDAR`.
2. In `tests/test_rest.py`, add a test class for the endpoint. Cover:
   - 200 with `text/calendar` and a `Content-Disposition` attachment header;
   - a body containing `BEGIN:VCALENDAR`, `SUMMARY`, `LOCATION`, `DTSTART`, `DTEND`, `DESCRIPTION` and `UID`;
   - 404 for an unknown ID, with the error detail in `response.json()["detail"]`.
3. Look at how the existing tests check MCP behaviour. If there is a precedent, add an assertion that the new tool is listed. If there is none, skip it and say so.
4. Reuse the fixtures in `tests/conftest.py`. Do not patch `SessionLocal` in only one place (see the footgun in `AGENTS.md`).

**Relevant Context:**
- [`booking_system_backend/tests/conftest.py`](booking_system_backend/tests/conftest.py)
- [`booking_system_backend/tests/test_rest.py`](booking_system_backend/tests/test_rest.py): see the `TestCancelEndpoint` pattern
- [`booking_system_backend/tests/test_services.py`](booking_system_backend/tests/test_services.py): see the `TestBookingService` cancel tests

**Status:** `[ ] pending`

---

### 4. Frontend: "Add to Calendar" button
**Intent:** Let users download the .ics from an active booking card.

**Expected Outcomes:**
- Booked bookings show an "Add to Calendar" button beside Cancel. Cancelled and completed bookings do not.
- Clicking it downloads `booking-{id}.ics` through the browser, and Axios is not used.

**Todo List:**
1. Import the `CalendarPlus` icon from `lucide-react` in `BookingCard.tsx`.
2. Add a helper that builds the URL from the same base as `api.ts` (`VITE_API_URL || '/api'`) plus `/bookings/{booking_id}/export.ics`. Prefer exporting the base URL from `api.ts` over duplicating the expression.
3. Add a click handler that creates a temporary `<a>` with `href` and `download`, appends it to the document, clicks it, and removes it.
4. Change the action area to a flex row holding the Calendar and Cancel buttons. Show the Calendar button only when `booking.status === 'booked'`. Use the existing `Button` component with a non-danger variant. Check the `Button` props and variants before choosing.
5. Keep the cancelled and completed card layouts unchanged.
6. Run `cd booking_system_frontend && npm run lint && npm run build`.

**Relevant Context:**
- [`booking_system_frontend/src/components/bookings/BookingCard.tsx`](booking_system_frontend/src/components/bookings/BookingCard.tsx:73): `canCancel` gate at line 73, Cancel button at lines 156–167
- [`booking_system_frontend/src/services/api.ts`](booking_system_frontend/src/services/api.ts:14): base URL
- [`booking_system_frontend/vite.config.ts`](booking_system_frontend/vite.config.ts): `/api` proxy
- Custom Tailwind tokens: do not assume standard colour names

**Status:** `[ ] pending`

---

### 5. Verification
**Intent:** Confirm the acceptance criteria are met.

**Expected Outcomes:**
- Backend `pytest` and ruff are clean, and frontend lint and build pass.
- A live check against seeded data confirms the endpoint, headers and download.

**Todo List:**
1. Use the `verify` skill to run the cheap checks (ruff, pytest, frontend lint).
2. Run the backend with seed data. Request `/bookings/{id}/export.ics` and check the headers, the CRLF line endings, and that the `DTSTART` and `DTEND` values come from the seed's `2099-...Z` times.
3. Check manually in the UI that the button appears only on booked cards and that it downloads a file.
4. Check that the MCP endpoint (`/mcp`) lists the new tool.
5. Open the downloaded file in a calendar app, or validate it with an iCalendar parser if one is available. The issue requires it to open in Apple and Google Calendar.
6. Run e2e only if requested. This change does not touch the Java service or any cross-service flow.

**Status:** `[ ] pending`

## Out of scope
- Google Calendar deep-links.
- Multi-VEVENT itineraries for multi-leg trips.
- Third-party iCalendar libraries.
- Fixing the `AGENTS.md` and demo-doc errors about manual MCP tools. These are noted here, but fixing them is a separate change.
- Frontend unit tests, since no test framework is set up.

## Open questions
- None remaining after the status-gating decision above.
