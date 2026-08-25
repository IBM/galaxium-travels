# Cancellation Preview Plan
**GitHub Issue:** #43 — Refund preview on cancel

## Overview

The cancel modal today only asks "are you sure?". This plan adds a real cancellation-policy preview:
a new `GET /bookings/{id}/cancellation-preview` backend endpoint computes the refund / fee / credit
breakdown based on days-to-departure policy tiers; the frontend fetches that breakdown and renders
it in the cancel modal before the user confirms.

**Scope:** Backend policy logic + REST endpoint + MCP tool; frontend modal UI update.  
**Out of scope:** Actual refund processing (payment system remains a stub).

---

## Policy Tiers (for reference)

| Days to departure | Refund | Fee | Travel credit |
|---|---|---|---|
| 7+ | 100% | 0% | 0% |
| 3–6 | 75% | 10% | 15% |
| 1–2 | 0% | 25% | 25% |
| Same-day (0) | 0% | 0% | 0% (total forfeit) |

---

## Sub-Tasks

---

### Sub-Task 1 — Backend: cancellation-policy service function

**Status:** [ ] pending

**Intent**  
Add a pure, DB-free policy helper and a DB-backed preview function to
`booking_system_backend/services/booking.py` so the logic is unit-testable in isolation.

**Expected Outcomes**
- `compute_cancellation_policy(price, departure_time_str)` returns a dict with keys
  `tier_label`, `refund_amount`, `fee_amount`, `credit_amount`, `total_kept`, `refund_pct`, `fee_pct`, `credit_pct`.
- The function handles all three departure-time string formats:
  `%Y-%m-%d %H:%M`, `%Y-%m-%dT%H:%M:%S`, `%Y-%m-%dT%H:%M:%SZ`.
- `get_cancellation_preview(db, booking_id)` looks up the booking + flight, calls the policy
  helper, and returns a `CancellationPreview` Pydantic schema or `ErrorResponse`.

**Todo List**
1. Add `CancellationPreview` Pydantic schema to `booking_system_backend/schemas.py` with fields:
   `booking_id`, `flight_id`, `price`, `tier_label`, `refund_amount`, `fee_amount`,
   `credit_amount`, `total_kept`, `refund_pct`, `fee_pct`, `credit_pct`.
2. In `services/booking.py`, implement `compute_cancellation_policy(price, departure_time_str)`.
   - Try each format string in order; raise a clear `ValueError` only if none match.
   - Compute days delta from `datetime.now(tz=timezone.utc)`.
   - Apply the four policy tiers to derive amounts from `price`.
   - Return the dict.
3. In `services/booking.py`, implement `get_cancellation_preview(db, booking_id)`.
   - Load `Booking` by ID; return `ErrorResponse` if not found or already cancelled.
   - Load related `Flight` for `departure_time` and `base_price`.
   - Derive `price` from the stored booking (same multiplier logic already used in `book_flight`).
   - Call `compute_cancellation_policy` and return a `CancellationPreview`.

**Relevant Context**
- [`booking_system_backend/services/booking.py`](booking_system_backend/services/booking.py) —
  follow existing return-type pattern (`BookingOut | ErrorResponse`).
- [`booking_system_backend/schemas.py`](booking_system_backend/schemas.py) —
  add new `CancellationPreview` model here.
- Seed data uses `"YYYY-MM-DDTHH:MM:SSZ"` format; test fixtures may use `"YYYY-MM-DD HH:MM"` —
  both must parse.
- `SEAT_CLASS_MULTIPLIERS` already defined in `booking.py`; reuse it to recover the paid price.

---

### Sub-Task 2 — Backend: REST endpoint + MCP tool

**Status:** [ ] pending

**Intent**  
Expose the preview function via a FastAPI route and an MCP tool so both the frontend and
AI agents can access it.

**Expected Outcomes**
- `GET /bookings/{id}/cancellation-preview` returns a `CancellationPreview` JSON body (200)
  or a 404 JSON error.
- The route is registered **before** `GET /bookings/{user_id}` in `server.py` to avoid
  FastAPI's first-match shadowing.
- An MCP tool `get_cancellation_preview` is registered and works against the real DB.

**Todo List**
1. In `server.py`, register `GET /bookings/{booking_id}/cancellation-preview` immediately
   before the existing `GET /bookings/{user_id}` route (check current line ~169).
2. The handler calls `booking.get_cancellation_preview(db, booking_id)`, checks for
   `ErrorResponse`, raises `HTTPException(404)` if so, else returns the preview.
3. Register a matching MCP tool `get_cancellation_preview(booking_id: int)` that opens its
   own `SessionLocal` session, calls the service, closes the session, and returns the dict —
   following the existing direct-`SessionLocal` MCP tool pattern (not `Depends(get_db)`).

**Relevant Context**
- [`booking_system_backend/server.py`](booking_system_backend/server.py:169) —
  route registration order is critical; insert before `GET /bookings/{user_id}`.
- Project footgun: MCP tools must call `SessionLocal()` directly, not use `Depends(get_db)`.
- Look at `cancel_booking` MCP tool as the template for the new tool.

---

### Sub-Task 3 — Backend: unit tests

**Status:** [ ] pending

**Intent**  
Verify the policy logic and the preview service function are correct, including edge-case
date formats and all four policy tiers.

**Expected Outcomes**
- `TestCancellationPolicy` class covers:
  - Same-day (0 days) → total forfeit
  - 1-day → no refund, 25% fee, 25% credit
  - 2-day → same as 1-day
  - 4-day → 75% refund, 10% fee, 15% credit
  - 8-day → full refund
  - At least one test uses the exact seed-data format `"YYYY-MM-DDTHH:MM:SSZ"`.
  - At least one test uses the fixture format `"YYYY-MM-DD HH:MM"`.
- `TestGetCancellationPreview` covers success, not-found, and already-cancelled cases.

**Todo List**
1. In `booking_system_backend/tests/test_services.py`, add `TestCancellationPolicy` class
   with one test method per tier, plus format-variant tests.
2. Add `TestGetCancellationPreview` class using the existing `db_session` fixture.
3. Run `pytest booking_system_backend/tests/test_services.py -v` and confirm all pass.

**Relevant Context**
- [`booking_system_backend/tests/conftest.py`](booking_system_backend/tests/conftest.py) —
  use `db_session` and `sample_data` fixtures already defined there.
- [`booking_system_backend/tests/test_services.py`](booking_system_backend/tests/test_services.py) —
  follow `test_cancel_booking_success` as the structural template.

---

### Sub-Task 4 — Frontend: API client function

**Status:** [ ] pending

**Intent**  
Add a typed `getCancellationPreview` function to the API service layer so the modal can
fetch the breakdown before rendering.

**Expected Outcomes**
- `getCancellationPreview(bookingId: number)` exists in `api.ts`.
- It calls `GET /bookings/{bookingId}/cancellation-preview`.
- Return type is `CancellationPreview | ErrorResponse`.
- A matching `CancellationPreview` TypeScript interface is defined in `types/`.

**Todo List**
1. Add `CancellationPreview` interface to `booking_system_frontend/src/types/` (or the existing
   types file, following current conventions).
2. In `booking_system_frontend/src/services/api.ts`, add `getCancellationPreview(bookingId)`.
   - Use the existing `api.get` pattern.
   - Return type: `Promise<CancellationPreview | ErrorResponse>`.

**Relevant Context**
- [`booking_system_frontend/src/services/api.ts`](booking_system_frontend/src/services/api.ts) —
  follow `cancelBooking` as the structural template; check `success` field not HTTP status.
- [`booking_system_frontend/src/types/`](booking_system_frontend/src/types/) —
  identify the right file for the new interface.

---

### Sub-Task 5 — Frontend: cancel modal UI

**Status:** [ ] pending

**Intent**  
Update the cancel modal in `MyBookings.tsx` to fetch and display the policy breakdown
before the user confirms cancellation.

**Expected Outcomes**
- When "Cancel Booking" is clicked, the modal fetches the preview and shows:
  1. A **policy tier badge** at the top (e.g. "Full Refund ✓" or "Non-refundable").
  2. A **segmented proportion bar** (colour-coded bands: refund / fee / credit).
  3. **Per-row line items** with icons: refund, fee, travel credit.
  4. A **"You'll receive back" summary row** (net cash refund) separated by a divider.
- A loading state is shown while the preview is fetching.
- If the fetch fails, an inline error message is shown (modal stays open, cancel button disabled).
- Existing "Keep Booking" / "Cancel Booking" confirm flow is unchanged.

**Todo List**
1. Add state to `MyBookings.tsx`:
   - `previewLoading: boolean`
   - `cancellationPreview: CancellationPreview | null`
   - `previewError: string | null`
2. Update `handleCancelClick` to:
   - Open the modal immediately (show spinner).
   - `await getCancellationPreview(bookingId)`, set preview state.
   - Handle error case (set `previewError`, disable confirm button).
3. In the modal body, render the breakdown block:
   - Tier badge component (conditional styling per tier label).
   - Proportion bar: three `<div>` segments with widths set by `refund_pct`, `fee_pct`,
     `credit_pct`; use Tailwind colour classes consistent with the space-themed palette
     (see `tailwind.config.js`).
   - Line items with inline SVG icons or a compatible icon library already in use.
   - Divider + "You'll receive back: $X" summary row.
4. Keep the modal size at "sm" or expand to "md" only if content overflows.
5. Run `npm run build` in `booking_system_frontend` to confirm no TypeScript errors.

**Relevant Context**
- [`booking_system_frontend/src/pages/MyBookings.tsx`](booking_system_frontend/src/pages/MyBookings.tsx) —
  cancel modal is at lines ~253–276; `handleCancelClick` is at ~line 92.
- [`booking_system_frontend/tailwind.config.js`](booking_system_frontend/tailwind.config.js) —
  custom space-themed palette; do not assume standard Tailwind color names.
- Issue design notes: tier badge, proportion bar, per-row icons, summary row — all required.

---

## Ordering & Dependencies

```
Sub-Task 1 (policy logic + schemas)
    ↓
Sub-Task 2 (REST endpoint + MCP tool)   Sub-Task 3 (backend unit tests)
    ↓                                           ↑ (depends on Sub-Task 1)
Sub-Task 4 (API client)
    ↓
Sub-Task 5 (modal UI)
```

Sub-Tasks 2 and 3 can proceed in parallel after Sub-Task 1 is done.  
Sub-Task 4 requires only the schema definition from Sub-Task 1 (no server running).

---

## Verification Checklist (run after all sub-tasks)

- [ ] `pytest booking_system_backend/tests/ -v` — all tests pass
- [ ] `cd booking_system_frontend && npm run build` — no TypeScript or lint errors
- [ ] Manual smoke: start backend, open MyBookings, click Cancel, confirm preview renders
