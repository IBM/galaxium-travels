# Refund Preview on Cancel — Implementation Plan

**GitHub Issue:** #43
**Branch:** dev-day-demo-q3-2026-mj-09

## Overview

When a user opens the cancel modal for a booking, the app currently shows only "Are you sure?". This plan adds a `GET /bookings/{id}/cancellation-preview` backend endpoint that computes a refund/fee/credit breakdown based on days-to-departure, and updates the cancel modal in `MyBookings.tsx` to fetch and display that breakdown before the user confirms.

**Out of scope:** actual refund processing (payment system remains a stub).

---

## Cancellation Policy Reference

| Days to departure | Refund | Fee | Travel credit |
|---|---|---|---|
| 7+ | 100% | 0% | 0% |
| 3–6 | 75% | 10% | 15% |
| 1–2 | 0% | 25% | 25% (kept as credit) |
| Same-day (0) | 0% | 0% | 0% (total forfeit) |

---

## Sub-Tasks

---

### Sub-Task 1 — Backend: cancellation policy helper + unit tests

**Status:** [ ] pending

**Intent**
Encapsulate the policy logic in an isolated, testable function so the endpoint does no arithmetic itself. Keeping policy separate also makes it easy to change tiers later.

**Expected Outcomes**
- A `compute_cancellation_preview(price_paid, departure_time_str)` function exists in `booking_system_backend/services/booking.py` (or a new `cancellation.py` if preferred).
- The function handles the three departure-time string formats: `%Y-%m-%d %H:%M`, `%Y-%m-%dT%H:%M:%S`, `%Y-%m-%dT%H:%M:%SZ`.
- Returns a dict/Pydantic model with: `tier_label`, `refund_amount`, `fee_amount`, `credit_amount`, `refund_pct`, `fee_pct`, `credit_pct`.
- At least one test per policy tier, plus one test using the exact ISO-Z format from `seed.py` (e.g. `"2099-01-01T09:00:00Z"`).

**Todo List**
1. Add `compute_cancellation_preview(price_paid: float, departure_time_str: str) -> dict` to `booking_system_backend/services/booking.py`.
2. Add a `strptime` multi-format parser that tries all three formats in order and raises a clear `ValueError` if none match.
3. Implement the four policy tiers using `(departure_dt - datetime.utcnow()).days`.
4. Add `CancellationPreviewOut` Pydantic schema to `booking_system_backend/schemas.py` with fields: `tier_label: str`, `refund_amount: float`, `fee_amount: float`, `credit_amount: float`, `refund_pct: int`, `fee_pct: int`, `credit_pct: int`, `price_paid: float`.
5. Write tests in `booking_system_backend/tests/test_services.py` covering all four tiers and the ISO-Z format.

**Relevant Context**
- `booking_system_backend/services/booking.py` — existing service functions; add new function here following the same pattern.
- `booking_system_backend/schemas.py` — `BookingOut` and `ErrorResponse` show the schema patterns.
- `booking_system_backend/seed.py` — departure time format: `"2099-01-01T09:00:00Z"` (ISO-Z).
- `booking_system_backend/tests/test_services.py` — existing test patterns using in-memory SQLite.

---

### Sub-Task 2 — Backend: `GET /bookings/{id}/cancellation-preview` endpoint + MCP tool

**Status:** [ ] pending

**Intent**
Expose the policy helper over HTTP so the frontend can fetch a preview without needing any business logic in the browser. Register the MCP tool so agents can also call it.

**Expected Outcomes**
- `GET /bookings/{booking_id}/cancellation-preview` returns a `CancellationPreviewOut` JSON body (200) or `ErrorResponse` (404 if booking not found).
- The route is registered **before** `GET /bookings/{user_id}` in `server.py` to avoid FastAPI's wildcard-shadowing issue.
- The corresponding MCP tool is registered following the existing pattern in `server.py`.
- A REST test in `booking_system_backend/tests/test_rest.py` covers: valid booking → 200 with correct breakdown; unknown booking_id → 404.

**Todo List**
1. Add a `get_booking_by_id(db, booking_id)` helper to `booking_system_backend/services/booking.py` that returns `BookingOut | ErrorResponse`.
2. Add `GET /bookings/{booking_id}/cancellation-preview` route in `server.py` **above** the existing `GET /bookings/{user_id}` route (line ~169). Call `get_booking_by_id` then `compute_cancellation_preview`.
3. Also register the matching MCP tool for the preview endpoint.
4. Add REST tests in `test_rest.py` for the new endpoint.

**Relevant Context**
- `booking_system_backend/server.py` line ~169 — `GET /bookings/{user_id}` route that must be registered **after** the new route.
- `booking_system_backend/server.py` — existing FastAPI route + MCP tool registration pattern.
- `booking_system_backend/services/booking.py` — `cancel_booking` returns `BookingOut | ErrorResponse`; use same pattern.
- AGENTS.md footgun: *`GET /bookings/{id}/cancellation-preview` must be registered before `GET /bookings/{user_id}`*.

---

### Sub-Task 3 — Frontend: API integration

**Status:** [ ] pending

**Intent**
Add a typed `getCancellationPreview` function to the API service layer so components don't construct URLs themselves.

**Expected Outcomes**
- `getCancellationPreview(bookingId: string): Promise<CancellationPreview | ErrorResponse>` exists in `booking_system_frontend/src/services/api.ts`.
- `CancellationPreview` TypeScript interface is defined in `booking_system_frontend/src/types/` (or inline in `api.ts` if types are co-located there).
- The function follows the existing error-response pattern (`isErrorResponse` guard already present).

**Todo List**
1. Add `CancellationPreview` interface to `booking_system_frontend/src/types/` (or `api.ts` if that is the project convention) with fields matching `CancellationPreviewOut`.
2. Add `getCancellationPreview(bookingId: string)` to `api.ts` following the existing fetch/error-check pattern.

**Relevant Context**
- `booking_system_frontend/src/services/api.ts` — all existing API call patterns; note the `isErrorResponse()` type guard and `success: false` check.
- `booking_system_frontend/src/types/` — TypeScript type definitions.

---

### Sub-Task 4 — Frontend: cancel modal UI

**Status:** [ ] pending

**Intent**
Replace the "are you sure?" cancel modal with a rich refund-preview block that shows the user exactly what they'll get back before they confirm, matching real travel-site UX.

**Expected Outcomes**
- When the cancel modal opens, the app calls `getCancellationPreview` and shows a loading state while fetching.
- The modal displays:
  - **Policy tier badge** at the top (e.g. "Full Refund ✓", "Partial Refund", "Non-refundable").
  - **Segmented proportion bar** with colour-coded bands: refund (green) / fee (red) / credit (amber) proportional to percentages.
  - **Per-row breakdown** with icons: refund row, fee row, travel credit row, each showing amount and percentage.
  - **"You'll receive back" summary row** (net cash refund) separated by a divider.
- On error fetching preview, modal falls back to the plain confirmation without a breakdown (graceful degradation).
- "Cancel Booking" confirm button remains; clicking it calls the existing `cancelBooking` API as before.

**Todo List**
1. In `MyBookings.tsx`, add state: `previewData: CancellationPreview | null`, `previewLoading: boolean`, `previewError: boolean`.
2. Update `handleCancelClick` to call `getCancellationPreview(booking.booking_id)` and store the result before showing the modal.
3. Build the refund breakdown block inside the modal:
   a. Tier badge component (span with conditional colour class).
   b. Proportion bar (three `div` elements with `width: X%` using inline styles or Tailwind arbitrary values).
   c. Breakdown rows with inline SVG or Heroicons/Lucide icons (whichever is already in the project).
   d. Divider + "You'll receive back" summary row.
4. Keep the existing "Are you sure you want to cancel?" text and both action buttons unchanged.
5. Verify the Tailwind space-themed palette (`tailwind.config.js`) is used for colours rather than default Tailwind color names.

**Relevant Context**
- `booking_system_frontend/src/pages/MyBookings.tsx` lines ~252–276 — current cancel modal.
- `booking_system_frontend/tailwind.config.js` — custom space-themed colour tokens; use these, not default Tailwind names.
- `booking_system_frontend/src/services/api.ts` — `isErrorResponse` guard for the preview fetch result.

---

## Acceptance Criteria Checklist

- [ ] Cancel modal shows refund / fee / credit breakdown before confirm
- [ ] Breakdown varies by days-to-departure per documented policy
- [ ] Wording is clear and product-appropriate
- [ ] Policy helper is unit-tested in the backend (all 4 tiers + ISO-Z format)
- [ ] `GET /bookings/{id}/cancellation-preview` endpoint registered before `GET /bookings/{user_id}`
- [ ] Frontend falls back gracefully if preview fetch fails
