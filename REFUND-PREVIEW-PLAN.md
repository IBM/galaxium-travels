# Refund Preview on Cancel — Implementation Plan

> Closes GitHub Issue #43

## Overview

Add a cancellation-policy preview to the cancel modal in `MyBookings.tsx`. Before the user confirms a cancellation, they will see a refund/fee/credit breakdown based on how many days remain until departure.

**Policy tiers:**
| Days to departure | Cash refund | Fee | Travel credit |
|---|---|---|---|
| 7+ days | 100% | 0% | 0% |
| 3–6 days | 75% | 10% | 15% |
| 1–2 days | 0% | 25% | 25% |
| Same-day (0) | 0% | 0% | 0% (total forfeit) |

**Approach:** Backend owns the policy calculation and exposes `GET /bookings/{id}/cancellation-preview`. The frontend fetches this preview when the cancel modal opens and renders the breakdown. Actual refund processing is out of scope.

**Key constraint:** `GET /bookings/{id}/cancellation-preview` must be registered in `server.py` *before* `GET /bookings/{user_id}` — FastAPI matches in registration order, and the existing wildcard would shadow the new route otherwise.

---

## Sub-Task 1 — Backend: cancellation policy helper + service function

**Status:** `[ ] pending`

### Intent
Encapsulate all cancellation-policy logic in a single, testable helper that accepts `price_paid` and `departure_time` (as a string) and returns the breakdown. The helper must be independent of the database so it can be unit-tested without fixtures.

### Expected Outcomes
- A pure function `compute_cancellation_preview(price_paid: int, departure_time: str) -> CancellationPreview` exists in `booking_system_backend/services/booking.py` (or a new `cancellation.py` module — follow existing file patterns).
- The function handles all three departure-time string formats: `%Y-%m-%d %H:%M`, `%Y-%m-%dT%H:%M:%S`, `%Y-%m-%dT%H:%M:%SZ`.
- A Pydantic schema `CancellationPreview` exists in `booking_system_backend/schemas.py` with fields: `tier_label: str`, `refund_amount: int`, `fee_amount: int`, `credit_amount: int`, `total_forfeited: int`, `price_paid: int`.
- A service wrapper `get_cancellation_preview(db, booking_id) -> CancellationPreview | ErrorResponse` queries the booking + its flight and calls the pure helper.

### Todo List
1. Add `CancellationPreview` Pydantic schema to `booking_system_backend/schemas.py`.
2. Add `compute_cancellation_preview(price_paid, departure_time)` pure helper in the booking service — implement the four policy tiers using `datetime.utcnow()` for the current time reference.
3. Add `get_cancellation_preview(db, booking_id)` service function that looks up the booking and its flight, then delegates to the helper. Return `ErrorResponse` if the booking does not exist.
4. Ensure the helper raises a clear `ValueError` for unrecognised date formats (do not silently return wrong numbers).

### Relevant Context
- `booking_system_backend/services/booking.py` — existing service patterns; `cancel_booking` shows how to look up a booking and return `BookingOut | ErrorResponse`.
- `booking_system_backend/schemas.py` lines 58-67 — `BookingOut` as a pattern for the new schema.
- `booking_system_backend/models.py` — `Booking` has `price_paid` and `flight_id`; `Flight` has `departure_time`.
- `booking_system_backend/seed.py` lines 38-48 — live data uses `"YYYY-MM-DDTHH:MM:SSZ"` format. Test fixtures use `"YYYY-MM-DD HH:MM"`.

---

## Sub-Task 2 — Backend: REST endpoint + MCP tool

**Status:** `[ ] pending`

### Intent
Expose the cancellation preview via HTTP so the frontend can fetch it, and automatically register it as an MCP tool for agent use.

### Expected Outcomes
- `GET /bookings/{id}/cancellation-preview` is registered in `server.py` and returns `CancellationPreview`.
- The route is registered **before** `GET /bookings/{user_id}` (currently around line 169) to prevent route shadowing.
- Because `server.py` uses `FastApiMCP`, the endpoint is automatically available as an MCP tool — no separate `@mcp.tool` decorator needed.
- Returns HTTP 404 (via `HTTPException`) when the booking does not exist.

### Todo List
1. In `booking_system_backend/server.py`, add the import for `get_cancellation_preview` and `CancellationPreview`.
2. Register `GET /bookings/{id}/cancellation-preview` before the existing `GET /bookings/{user_id}` route.
3. In the handler, call `get_cancellation_preview(db, id)`, check for `ErrorResponse`, and raise `HTTPException(status_code=404)` if so.

### Relevant Context
- `booking_system_backend/server.py` lines 169-172 — `GET /bookings/{user_id}` is the route that would shadow the new endpoint if ordering is wrong.
- AGENTS.md footgun: "FastAPI matches in registration order and the wildcard will shadow the two-segment path otherwise."
- `server.py` lines 175-186 — `POST /cancel/{booking_id}` as a pattern for error handling.

---

## Sub-Task 3 — Backend: unit tests for the policy helper

**Status:** `[ ] pending`

### Intent
Verify the four policy tiers and the multi-format date parsing are correct before the frontend depends on this logic.

### Expected Outcomes
- Tests in `booking_system_backend/tests/test_services.py` (or a new `test_cancellation.py`) cover:
  - 7+ days out → full refund, zero fee, zero credit.
  - 3–6 days out → 75% refund, 10% fee, 15% credit.
  - 1–2 days out → 0% refund, 25% fee, 25% credit.
  - Same-day → 0% refund, 0% fee, 0% credit (total forfeit).
  - Date string in `"YYYY-MM-DD HH:MM"` format (test-fixture format).
  - Date string in `"YYYY-MM-DDTHH:MM:SSZ"` format (seed/live format).
- All tests pass with `pytest booking_system_backend/`.

### Todo List
1. Write `test_compute_cancellation_preview_*` tests using the pure helper (no DB needed).
2. Include a test with departure_time taken verbatim from `seed.py` (e.g. `"2099-01-01T09:00:00Z"`).
3. Include a test with departure_time in `"YYYY-MM-DD HH:MM"` format matching test fixtures in `conftest.py`.
4. Run `pytest booking_system_backend/` and confirm all tests pass.

### Relevant Context
- `booking_system_backend/tests/conftest.py` — `sample_flight_data` at lines 73-84 uses `"2099-01-01 09:00"` format.
- `booking_system_backend/seed.py` lines 38-48 — live format `"2099-01-01T09:00:00Z"`.
- `booking_system_backend/tests/test_services.py` — existing pattern for service unit tests.

---

## Sub-Task 4 — Frontend: API function + TypeScript type

**Status:** `[ ] pending`

### Intent
Add a typed API call so the cancel modal can fetch the preview without duplicating fetch logic.

### Expected Outcomes
- `CancellationPreview` TypeScript interface added to `booking_system_frontend/src/types/index.ts`.
- `getCancellationPreview(bookingId: number): Promise<CancellationPreview | ErrorResponse>` added to `booking_system_frontend/src/services/api.ts`.
- The function follows the existing pattern (uses the `api` axios instance, checks `success: false` for errors).

### Todo List
1. Add `CancellationPreview` interface to `booking_system_frontend/src/types/index.ts` matching the backend schema fields: `tier_label`, `refund_amount`, `fee_amount`, `credit_amount`, `total_forfeited`, `price_paid`.
2. Add `getCancellationPreview` in `booking_system_frontend/src/services/api.ts` — `GET /bookings/${bookingId}/cancellation-preview`.

### Relevant Context
- `booking_system_frontend/src/types/index.ts` lines 20-28 — `Booking` interface as a pattern.
- `booking_system_frontend/src/services/api.ts` lines 132-135 — `getUserBookings` as a pattern; lines 140-147 — `cancelBooking` as a pattern.
- AGENTS.md convention: "always inspect the `success` field or look for `error` in the body — HTTP status is not reliable."

---

## Sub-Task 5 — Frontend: cancel modal UI

**Status:** `[ ] pending`

### Intent
Replace the generic "are you sure?" modal with a rich refund-preview block. The user sees the breakdown before confirming.

### Expected Outcomes
- When the user clicks "Cancel Booking", `MyBookings.tsx` calls `getCancellationPreview` and stores the result in state.
- While the preview is loading, the modal shows a spinner/skeleton.
- On success, the modal displays:
  - A **policy tier badge** at the top (e.g. "Full Refund ✓", "Partial Refund", "Non-refundable").
  - A **segmented proportion bar** with colour-coded bands for refund / fee / credit.
  - **Per-row breakdown** with icons: refund (arrow-return), fee (x-circle), travel credit (ticket).
  - A **"You'll receive back" summary row** (divider + net cash refund) at the bottom.
  - All amounts formatted via the existing `formatCurrency()` utility.
- The "Cancel Booking" confirm button remains at the bottom; "Keep Booking" dismisses.
- On preview fetch error, the modal falls back to the existing generic confirmation text (do not block cancellation).
- The frontend passes `npm run lint` (or equivalent check).

### Todo List
1. Add state to `MyBookings.tsx`: `previewData: CancellationPreview | null`, `previewLoading: boolean`, `previewError: boolean`.
2. Modify `handleCancelClick` to call `getCancellationPreview(bookingId)` and populate `previewData` before showing the modal.
3. Replace the modal body in `MyBookings.tsx` (lines 252-276) with the new breakdown UI.
4. Implement the proportion bar as an inline `<div>` with three colour-coded segments (widths are `refund/price_paid * 100%`, etc.). Use existing Tailwind space-theme tokens.
5. Add per-row icons — use whatever icon library is already imported in the project (check existing imports in `BookingCard.tsx` or `MyBookings.tsx`).
6. Add the "You'll receive back" summary row with a top divider.
7. Handle loading state (spinner) and error fallback (generic text).
8. Run frontend lint/typecheck; fix any issues.

### Relevant Context
- `booking_system_frontend/src/pages/MyBookings.tsx` lines 252-276 — current modal body to replace.
- `booking_system_frontend/src/pages/MyBookings.tsx` lines 97-120 — `handleConfirmCancel` (no changes needed here).
- `booking_system_frontend/src/utils/formatters.ts` lines 39-46 — `formatCurrency` for all amounts.
- `booking_system_frontend/tailwind.config.js` — space-themed palette; use only tokens defined there.
- `booking_system_frontend/src/components/bookings/BookingCard.tsx` — check icon imports already in use.
- Issue #43 design notes specify tier badge, proportion bar, per-row icons, and summary row as required UI elements.
