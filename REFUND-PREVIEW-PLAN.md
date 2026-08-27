# Refund Preview on Cancel — Implementation Plan

**Issue:** #43  
**Branch:** `dev-day-demo-q3-2026-mj-10`

## Overview

Replace the current "are you sure?" cancel modal with a rich refund-preview UI that shows the user exactly what they'll get back before confirming cancellation.

The policy tiers are:

| Days to departure | Cash refund | Fee | Travel credit |
| -------------------| -------------| -----| ---------------|
| 7+ days           | 100%        | 0%  | 0%            |
| 3–6 days          | 75%         | 10% | 15%           |
| 1–2 days          | 0%          | 25% | 25%           |
| Same-day (0)      | 0%          | 0%  | 0%            |

### Scope
- New backend service function `get_cancellation_preview` with policy logic
- New `GET /bookings/{id}/cancellation-preview` REST endpoint (registered **before** the existing `GET /bookings/{user_id}` route)
- New MCP tool (auto-generated via FastMCP from the FastAPI route)
- New `CancellationPreview` Pydantic schema
- Policy helper unit-tested in the backend
- `getCancellationPreview` function added to `api.ts`
- `CancellationPreview` TypeScript type added to `types/index.ts`
- Cancel modal in `MyBookings.tsx` updated to fetch and display the breakdown
- Visual design: policy tier badge, segmented proportion bar, per-row icons, net cash summary row

### Out of scope
Actual refund processing; payment system is a stub.

---

## Sub-Tasks

### Sub-Task 1 — Backend: Policy logic + new schema + endpoint

**Status:** [ ] pending

**Intent**  
Implement all backend-side work: the cancellation-policy helper, a new `CancellationPreviewOut` schema, the `get_cancellation_preview` service function, and the REST endpoint. Getting this right first lets the frontend sub-task work against a real contract.

**Expected Outcomes**
- `GET /bookings/{booking_id}/cancellation-preview` returns a JSON payload with `tier_label`, `refund_amount`, `fee_amount`, `credit_amount`, and `total_price`
- The route is registered **before** `GET /bookings/{user_id}` in `server.py` (FastAPI registration-order footgun)
- Departure-time parsing handles both `"%Y-%m-%d %H:%M"` (test fixtures) and `"%Y-%m-%dT%H:%M:%S"` / `"%Y-%m-%dT%H:%M:%SZ"` (live DB / seed data)
- Returns 404 if the booking is not found, 409 if already cancelled
- FastMCP auto-generates an MCP tool for the route at no extra cost

**Todo List**
1. Add `CancellationPreviewOut` Pydantic schema to `booking_system_backend/schemas.py` with fields: `booking_id`, `tier_label`, `days_to_departure`, `total_price`, `refund_amount`, `fee_amount`, `credit_amount`
2. Add `get_cancellation_preview(db, booking_id)` to `booking_system_backend/services/booking.py`:
   - Look up the booking; return `ErrorResponse` if not found or already cancelled
   - Look up the associated flight to get `departure_time` and `price_paid`
   - Parse `departure_time` trying each format in order: `%Y-%m-%dT%H:%M:%SZ`, `%Y-%m-%dT%H:%M:%S`, `%Y-%m-%d %H:%M`; raise `ValueError` if none match
   - Compute `days_to_departure` as `(departure_dt.date() - today.date()).days` (use UTC today)
   - Apply the policy table to produce `tier_label`, `refund_amount`, `fee_amount`, `credit_amount`
   - Return a `CancellationPreviewOut`
3. In `server.py`, insert `GET /bookings/{booking_id}/cancellation-preview` **immediately above** the existing `GET /bookings/{user_id}` route (around line 169). Import `CancellationPreviewOut` in the import block.

**Relevant Context**
- `booking_system_backend/schemas.py` — add new schema here
- `booking_system_backend/services/booking.py` — follow the `BookingOut | ErrorResponse` return-type pattern used by `cancel_booking`
- `booking_system_backend/server.py:169` — critical registration order; new route must appear before `GET /bookings/{user_id}`
- `booking_system_backend/seed.py:38` — departure times use `"YYYY-MM-DDTHH:MM:SSZ"` in the live DB
- `booking_system_backend/tests/conftest.py:77` — test fixtures use `"YYYY-MM-DD HH:MM"` format

---

### Sub-Task 2 — Backend: Unit tests for policy logic

**Status:** [ ] pending

**Intent**  
Verify the policy helper and endpoint in isolation, covering all four policy tiers and both date-format variants. The acceptance criteria explicitly require unit tests for the policy helper.

**Expected Outcomes**
- At least one test per policy tier (7+, 3–6, 1–2, 0 days) verifying `refund_amount`, `fee_amount`, `credit_amount`, and `tier_label`
- At least one test using the ISO-8601-with-Z format from `seed.py` (e.g. `"2099-01-01T09:00:00Z"`)
- At least one test using the test-fixture format (`"2099-01-01 09:00"`)
- 404 test for unknown `booking_id`
- 409 test for already-cancelled booking
- All existing tests continue to pass (`pytest booking_system_backend/tests/`)

**Todo List**
1. Add a new test class `TestCancellationPreview` to `booking_system_backend/tests/test_services.py`
2. For each of the four tiers, create a booking with a flight whose `departure_time` puts it in the correct tier window relative to today; assert amounts and label
3. Add one test using the `"YYYY-MM-DDTHH:MM:SSZ"` departure format (mirrors seed data)
4. Add a 404 test (booking not found) and a 409 test (booking already cancelled)
5. Optionally add REST-level tests in `test_rest.py` for the new endpoint following existing patterns

**Relevant Context**
- `booking_system_backend/tests/test_services.py:267` — `TestBookingService` for pattern reference
- `booking_system_backend/tests/conftest.py` — `db_session` fixture; use `datetime.now(tz=timezone.utc) + timedelta(days=N)` to control departure distance
- Policy math: price_paid × percentage rates; use integer arithmetic to match backend

---

### Sub-Task 3 — Frontend: TypeScript type + API call

**Status:** [ ] pending

**Intent**  
Expose the new endpoint to the frontend by adding a matching TypeScript interface and an `api.ts` function, following existing conventions.

**Expected Outcomes**
- `CancellationPreview` interface exported from `booking_system_frontend/src/types/index.ts`
- `getCancellationPreview(bookingId: number): Promise<CancellationPreview>` exported from `booking_system_frontend/src/services/api.ts`
- Follows the existing pattern: axios call, inspect `success` / error fields per AGENTS.md conventions

**Todo List**
1. Add `CancellationPreview` interface to `booking_system_frontend/src/types/index.ts` mirroring the backend schema fields: `booking_id`, `tier_label`, `days_to_departure`, `total_price`, `refund_amount`, `fee_amount`, `credit_amount`
2. Add `getCancellationPreview` async function to `booking_system_frontend/src/services/api.ts` calling `GET /bookings/{bookingId}/cancellation-preview`; import `CancellationPreview` type

**Relevant Context**
- `booking_system_frontend/src/services/api.ts:132` — `getUserBookings` is the nearest comparable GET-by-id pattern
- `booking_system_frontend/src/types/index.ts` — add the new interface alongside `Booking`

---

### Sub-Task 4 — Frontend: Cancel modal redesign in MyBookings

**Status:** [ ] pending

**Intent**  
Replace the plain "are you sure?" cancel modal with the rich refund-preview breakdown described in the issue design notes: a policy-tier badge at the top, a segmented proportion bar, per-row icons for refund/fee/credit, and a net "You'll receive back" summary row.

**Expected Outcomes**
- Opening the cancel modal triggers `getCancellationPreview` and shows a loading state
- The modal displays: tier badge, three line items with icons and amounts, proportion bar, net summary row
- The "Cancel Booking" confirm button is disabled while the preview is loading
- If the preview fetch fails gracefully, the modal falls back to the original "are you sure?" copy so cancel still works
- Wording reads like a real travel product, not a debug dump
- No layout regressions on the rest of the `MyBookings` page

**Todo List**
1. Add state for `cancellationPreview` (`CancellationPreview | null`) and `previewLoading` (`boolean`) to `MyBookings.tsx`
2. In `handleCancelClick`, after setting `bookingToCancel` and `showCancelModal`, call `getCancellationPreview(bookingId)` asynchronously and set the preview state
3. Replace the modal body in `MyBookings.tsx` with a new layout:
   - **Policy tier badge** — e.g. `"Full Refund ✓"`, `"Partial Refund"`, `"Non-refundable"` derived from `tier_label`
   - **Three line items** with icons (`ArrowLeftCircle` for refund, `XCircle` for fee, `Ticket` for credit) showing label + formatted amount
   - **Proportion bar** — a flex row of coloured bands (green for refund, red for fee, amber for credit); widths proportional to amounts; hidden when all amounts are zero
   - **Divider + "You'll receive back" row** showing `refund_amount` in a larger font
4. Reset `cancellationPreview` and `previewLoading` in `handleConfirmCancel` and in the modal's `onClose` handler
5. Import `getCancellationPreview` and `CancellationPreview` at the top of `MyBookings.tsx`

**Relevant Context**
- `booking_system_frontend/src/pages/MyBookings.tsx:252–276` — current modal block to replace
- `booking_system_frontend/src/components/common/Modal.tsx` — modal accepts `size="sm"|"md"|"lg"`; upgrade to `"md"` for the richer layout
- `booking_system_frontend/tailwind.config.js` — use project tokens (`text-alien-green`, `text-solar-orange`, `text-cosmic-purple`, etc.) not standard Tailwind colour names
- `booking_system_frontend/src/utils/formatters.ts` — use `formatCurrency` for amounts
- Lucide icon names already imported in `BookingCard.tsx`: `XCircle`; add `ArrowLeftCircle` and `Ticket` (or nearest equivalents) from `lucide-react`
