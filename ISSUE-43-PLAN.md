# Issue #43 — Refund Preview on Cancel

## Overview

Add a cancellation preview to the cancel modal in `MyBookings.tsx` so users see a
`$X refund / $Y fee / $Z travel-credit` breakdown before they confirm. Policy is
time-based (days-to-departure). The backend owns the policy calculation and exposes
a new read-only `GET /bookings/{id}/cancellation-preview` endpoint; the frontend
fetches it when the modal opens and renders the breakdown.

**Out of scope:** actual refund processing (payment is a stub), testing the MCP
tool via a running server, or e2e Docker tests.

---

## Cancellation Policy Rules

| Days to departure | Refund | Fee | Travel credit |
|---|---|---|---|
| 7+ | 100% | 0% | 0% |
| 3–6 | 75% | 10% | 15% |
| 1–2 | 50% | 25% | 25% |
| 0 (same-day) | 0% | 0% | 0% |

Dollar amounts are derived from `price_paid` on the booking.

---

## Sub-Tasks

---

### Sub-Task 1 — Backend: cancellation policy helper + unit tests

**Status:** [ ] pending

**Intent**
Implement a pure, side-effect-free function that, given a `price_paid` (int) and
`days_to_departure` (int), returns the dollar breakdown. Keep it in
`booking_system_backend/services/booking.py` alongside the existing booking
helpers. Unit-test it thoroughly in
`booking_system_backend/tests/test_services.py`.

**Departure-time parsing note (from issue):**
The `departure_time` column stores different formats depending on data source:
- Test fixtures / seed data: `"YYYY-MM-DD HH:MM"` (no seconds, no timezone)
- Live ISO 8601 DB values: `"YYYY-MM-DDTHH:MM:SSZ"` (UTC `Z` suffix)
A single `strptime` pattern will silently break on real data. The service must
try both formats (or use `dateutil.parser.parse` / `fromisoformat` fallback).

**Expected outcomes**
- A function `calculate_cancellation_preview(price_paid, days_to_departure)` in
  `services/booking.py` that returns a dict with keys
  `refund_amount`, `fee_amount`, `travel_credit_amount`.
- Policy-boundary unit tests covering: 7+ days, 6 days, 3 days, 2 days, 1 day,
  same-day (0), and a negative-days guard (departed already → treat as same-day).
- `pytest` runs green.

**Todo list**
1. Add `calculate_cancellation_preview(price_paid: int, days_to_departure: int) -> dict`
   to `services/booking.py`.
2. Add class `TestCancellationPolicyHelper` to `tests/test_services.py` with
   boundary tests for all four policy bands.
3. Run `pytest tests/test_services.py` and confirm green.

**Relevant context**
- `booking_system_backend/services/booking.py` — existing booking helpers; follow
  the same function-per-concern pattern.
- `booking_system_backend/tests/test_services.py` — pattern for new test classes
  (e.g. `TestBookingService`).

---

### Sub-Task 2 — Backend: `get_cancellation_preview` service function + schema

**Status:** [ ] pending

**Intent**
Add a service function that loads a booking from the DB, resolves its flight's
`departure_time`, computes `days_to_departure`, and calls
`calculate_cancellation_preview`. Add a `CancellationPreview` Pydantic schema so
the response is typed.

**Expected outcomes**
- `get_cancellation_preview(db, booking_id)` in `services/booking.py` returns
  `CancellationPreviewOut | ErrorResponse`.
- `CancellationPreviewOut` schema in `schemas.py` with fields:
  `booking_id`, `price_paid`, `days_to_departure`, `refund_amount`,
  `fee_amount`, `travel_credit_amount`, `policy_description` (human-readable
  string e.g. `"3–6 days before departure"`).
- Both departure-time formats parsed correctly (see Sub-Task 1 note).
- Unit tests in `test_services.py` covering: found booking, booking not found,
  already-cancelled booking returning a sensible preview (treat departed as
  same-day).

**Todo list**
1. Add `CancellationPreviewOut` to `schemas.py`.
2. Add `get_cancellation_preview(db, booking_id)` to `services/booking.py`.
3. Handle both `"YYYY-MM-DD HH:MM"` and ISO 8601 `"YYYY-MM-DDTHH:MM:SSZ"` when
   parsing the flight's `departure_time`.
4. Add unit tests for `get_cancellation_preview` to `tests/test_services.py` using
   the in-memory DB fixture.
5. Run `pytest tests/test_services.py` and confirm green.

**Relevant context**
- `booking_system_backend/schemas.py` — add new schema here; follow the
  `BookingOut` pattern with `ConfigDict(from_attributes=True)`.
- `booking_system_backend/models.py` — `Flight.departure_time` is a `String`
  column (line 25); no ORM coercion — must parse manually.
- `booking_system_backend/services/booking.py` — `cancel_booking` shows how to
  join booking + flight.

---

### Sub-Task 3 — Backend: REST endpoint + MCP tool

**Status:** [ ] pending

**Intent**
Expose the service function as both a FastAPI REST endpoint (`GET
/bookings/{booking_id}/cancellation-preview`) and an MCP tool
(`get_cancellation_preview`), following the established add-both pattern in
`server.py`.

**Expected outcomes**
- `GET /bookings/{id}/cancellation-preview` returns `CancellationPreviewOut` on
  success or a 404/422 JSON error on failure, matching existing endpoint style.
- A matching `@mcp.tool()` that calls `get_cancellation_preview` directly via
  `SessionLocal()` / `db.close()` (not `Depends(get_db)`).
- REST endpoint is tested in `tests/test_rest.py`.

**Todo list**
1. Import `get_cancellation_preview` and `CancellationPreviewOut` in `server.py`.
2. Add `GET /bookings/{booking_id}/cancellation-preview` FastAPI route.
3. Add `get_cancellation_preview` MCP tool using the direct-`SessionLocal` pattern
   (see existing MCP tools in `server.py`).
4. Add `TestCancellationPreviewEndpoint` test class to `tests/test_rest.py`.
5. Run `pytest tests/test_rest.py` and confirm green.

**Relevant context**
- `booking_system_backend/server.py` — `cancel_booking_endpoint` (line 175) and
  its matching MCP tool are the direct template to follow.
- Project footgun: MCP tools call `SessionLocal()` directly and `db.close()` in a
  `finally` block — do NOT use `Depends(get_db)`.
- `tests/test_rest.py` — `TestCancelBookingEndpoint` is the test template.

---

### Sub-Task 4 — Frontend: `getCancellationPreview` API call + TypeScript type

**Status:** [ ] pending

**Intent**
Add the typed API helper to `api.ts` and the matching TypeScript interface to
`types/index.ts` so the component can call the endpoint.

**Expected outcomes**
- `CancellationPreview` interface exported from `src/types/index.ts`.
- `getCancellationPreview(bookingId: number): Promise<CancellationPreview | ErrorResponse>`
  exported from `src/services/api.ts`.
- `npm run build` (TypeScript compilation) succeeds with no new errors.

**Todo list**
1. Add `CancellationPreview` interface to `booking_system_frontend/src/types/index.ts`.
2. Add `getCancellationPreview` function to `booking_system_frontend/src/services/api.ts`
   following the `cancelBooking` pattern.
3. Run `npm run build` in `booking_system_frontend` to confirm no TS errors.

**Relevant context**
- `booking_system_frontend/src/services/api.ts` — `cancelBooking` (line 140) is
  the closest existing pattern.
- `booking_system_frontend/src/types/index.ts` — `Booking` interface shows the
  field-naming convention (snake_case matching backend).

---

### Sub-Task 5 — Frontend: update cancel modal in `MyBookings.tsx`

**Status:** [ ] pending

**Intent**
When the user clicks "Cancel Booking", fetch the preview before showing the modal.
While loading show a spinner inside the modal. Once loaded, display the refund
breakdown above the existing confirm/keep buttons. Use the theme tokens already in
the project (no new colours).

**Expected outcomes**
- Cancel modal shows `policy_description` heading, and three line items:
  `Refund: $X`, `Fee: $Y`, `Travel credit: $Z`.
- A loading state is shown while the preview is fetching.
- If the fetch fails, the modal still opens with a fallback message ("Unable to
  load refund details") so the user can still cancel.
- Wording follows Carbon/product content style: sentence-case, no passive voice.
- `npm run build` succeeds.

**Todo list**
1. Add `preview` and `previewLoading` state to `MyBookings.tsx`.
2. In `handleCancelClick`, fetch `getCancellationPreview(bookingId)` and store in
   state before/while setting `showCancelModal = true`.
3. Render the breakdown inside the `<Modal>` body above the action buttons.
   Use a loading spinner (`<LoadingSpinner>`) while `previewLoading` is true.
4. Handle error case: if `isErrorResponse(preview)`, show the fallback text.
5. Run `npm run build` and confirm clean.

**Relevant context**
- `booking_system_frontend/src/pages/MyBookings.tsx` — `handleCancelClick`
  (line 92) and the Modal block (line 252) are the two change points.
- `booking_system_frontend/src/components/common` — `LoadingSpinner` and `Modal`
  are already imported.
- `booking_system_frontend/src/services/api.ts` — `isErrorResponse` is already
  imported in the page.
- Theme tokens live in `tailwind.config.js`; use `text-star-white`, `text-nebula-*`
  colour classes already used elsewhere in the file.
