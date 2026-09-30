# Refund Preview on Cancel — Implementation Plan

> GitHub Issue #43 · Tier 3 · area/frontend + backend

## Overview

Today the cancel modal shows a bare "are you sure?" confirmation. This feature adds a **cancellation preview** step: before the user confirms, the UI fetches and displays an itemised breakdown of refund / fee / travel-credit based on how far out the departure is. Policy logic lives entirely in the backend; the frontend only renders what the API returns.

**Goal:** Implement `GET /bookings/{id}/cancellation-preview` and update the cancel modal in `MyBookings.tsx` to show the breakdown.

**Out of scope:** Actual refund processing (payment system is a stub).

---

## Cancellation Policy

| Days to departure | Refund | Fee | Travel credit |
|---|---|---|---|
| 7+ | 100% | 0% | 0% |
| 3–6 | 75% | 10% | 15% |
| 1–2 | 0% | 25% | 25% |
| Same-day (0) | 0% | 0% | 0% (total forfeit) |

---

## Sub-Tasks

---

### Sub-Task 1 — Backend: cancellation policy helper + preview service function

**Status:** `[ ] pending`

**Intent**  
Encapsulate the tier-based policy calculation in a pure, testable function so the REST endpoint and MCP tool only need to call it. Departure-time parsing must be defensive because `seed.py` uses `"YYYY-MM-DDTHH:MM:SSZ"` while test fixtures use `"YYYY-MM-DD HH:MM"`.

**Expected Outcomes**
- A `cancellation_policy(days_to_departure: int, total_price: float) -> dict` helper (or equivalent) that returns `{ tier, refund_amount, fee_amount, credit_amount }`.
- A `get_cancellation_preview(db, booking_id) -> CancellationPreview | ErrorResponse` service function that looks up the booking → joins to its flight → parses `departure_time` → calls the policy helper → returns the preview schema.
- The helper handles all three datetime formats: `%Y-%m-%d %H:%M`, `%Y-%m-%dT%H:%M:%S`, `%Y-%m-%dT%H:%M:%SZ`.

**Todo List**
1. In `booking_system_backend/schemas.py`, add a `CancellationPreview` Pydantic model with fields: `booking_id`, `total_price`, `tier_label` (str), `days_to_departure` (int), `refund_amount`, `fee_amount`, `credit_amount` (all float).
2. In `booking_system_backend/services/booking.py`, add `_parse_departure_time(dt_str: str) -> datetime` — tries each format in sequence, raises `ValueError` only if all fail.
3. In the same file, add `_cancellation_policy(days: int, price: float) -> dict` implementing the four-tier table above.
4. Add `get_cancellation_preview(db: Session, booking_id: int) -> CancellationPreview | ErrorResponse` that: fetches the booking (return `BOOKING_NOT_FOUND` if missing), joins to the flight, calls the two helpers, and returns a `CancellationPreview`.

**Relevant Context**
- `booking_system_backend/services/booking.py` — follow the `cancel_booking` lookup pattern (line 95).
- `booking_system_backend/schemas.py` — add `CancellationPreview` following the `BookingOut` model pattern.
- `booking_system_backend/models.py` — `Flight.departure_time` is a `String` column; `Booking` has `flight_id` FK to `Flight`.
- `booking_system_backend/seed.py` — seed departure format: `"2099-01-01T09:00:00Z"`.

---

### Sub-Task 2 — Backend: REST endpoint + MCP registration

**Status:** `[ ] pending`

**Intent**  
Expose the preview as a REST endpoint and ensure it is auto-exposed as an MCP tool via `FastApiMCP`.

**Expected Outcomes**
- `GET /bookings/{booking_id}/cancellation-preview` registered **before** `GET /bookings/{user_id}` in `server.py`.
- Returns `CancellationPreview` on success; 404 JSON on `BOOKING_NOT_FOUND`.
- MCP tool is auto-generated (no manual registration needed — `FastApiMCP` picks up all routes).

**Todo List**
1. In `booking_system_backend/server.py`, insert the new route **above** the existing `GET /bookings/{user_id}` route (currently line 169).
2. Route signature: `@app.get("/bookings/{booking_id}/cancellation-preview", response_model=CancellationPreview, tags=["Bookings"])`.
3. Handler calls `get_cancellation_preview(db, booking_id)`; if `isinstance(result, ErrorResponse)` → raise `HTTPException(404)`.
4. Import `CancellationPreview` and `get_cancellation_preview` at the top of `server.py`.

**Relevant Context**
- `booking_system_backend/server.py` line 169 — `GET /bookings/{user_id}` must stay **below** the new route (FastAPI matches registration order).
- `booking_system_backend/server.py` line 175 — `POST /cancel/{booking_id}` is the pattern to follow for path-param + error handling.

---

### Sub-Task 3 — Backend: unit tests

**Status:** `[ ] pending`

**Intent**  
Verify the policy helper and service function with both datetime formats and all four policy tiers. Verify the REST endpoint returns the right shape.

**Expected Outcomes**
- Tests for `_cancellation_policy` cover all four tiers (boundary values: 0, 1, 3, 7).
- Tests for `_parse_departure_time` cover `"YYYY-MM-DD HH:MM"`, `"YYYY-MM-DDTHH:MM:SS"`, and `"YYYY-MM-DDTHH:MM:SSZ"`.
- Service-layer test: `test_get_cancellation_preview_success` using a seeded booking with flight departure time in seed format (`"2099-01-01T09:00:00Z"`).
- Service-layer test: `test_get_cancellation_preview_not_found`.
- REST-layer test: `GET /bookings/{id}/cancellation-preview` returns 200 with correct fields; 404 for missing booking.

**Todo List**
1. In `booking_system_backend/tests/test_services.py`, add `TestCancellationPreviewService` class.
2. Add tests for all four policy tiers using fixed `days` values.
3. Add tests for each datetime format string.
4. Add `test_get_cancellation_preview_success` — create a user + flight (using seed departure format) + booking, call the service, assert `refund_amount`, `fee_amount`, `credit_amount`.
5. Add `test_get_cancellation_preview_not_found` — call with non-existent ID, assert `ErrorResponse`.
6. In `booking_system_backend/tests/test_rest.py`, add `TestCancellationPreviewEndpoint` with happy-path and 404 cases.

**Relevant Context**
- `booking_system_backend/tests/conftest.py` — use `db_session` and `client` fixtures; `sample_flight_data` uses `"2099-01-01 09:00"` format (line 78) — a separate fixture with the seed format should be added to test the real-world path.
- Existing `TestCancelEndpoint` (test_rest.py line 369) is the closest structural reference.

---

### Sub-Task 4 — Frontend: TypeScript type + API call

**Status:** `[ ] pending`

**Intent**  
Add the `CancellationPreview` type and a `getCancellationPreview` function so the modal can fetch the breakdown.

**Expected Outcomes**
- `CancellationPreview` TypeScript interface exists in `booking_system_frontend/src/types/`.
- `getCancellationPreview(bookingId: number): Promise<CancellationPreview>` is exported from `api.ts`.

**Todo List**
1. In `booking_system_frontend/src/types/` (or the appropriate shared types file), add:
   ```ts
   interface CancellationPreview {
     booking_id: number;
     total_price: number;
     tier_label: string;
     days_to_departure: number;
     refund_amount: number;
     fee_amount: number;
     credit_amount: number;
   }
   ```
2. In `booking_system_frontend/src/services/api.ts`, add:
   ```ts
   export const getCancellationPreview = async (bookingId: number): Promise<CancellationPreview> => {
     const response = await api.get<CancellationPreview>(`/bookings/${bookingId}/cancellation-preview`);
     return response.data;
   };
   ```
3. Import `CancellationPreview` in `api.ts` (or co-locate the type if the project pattern allows).

**Relevant Context**
- `booking_system_frontend/src/services/api.ts` — follow the `getUserBookings` pattern (line 132).
- Error handling is centralised in the axios response interceptor; no per-call try/catch needed for the happy path.

---

### Sub-Task 5 — Frontend: cancel modal UI

**Status:** `[ ] pending`

**Intent**  
Update `MyBookings.tsx` so the cancel modal fetches and displays the cancellation preview before the user confirms. The UI should feel like a real travel site, not a debug dump.

**Expected Outcomes**
- When the cancel button is clicked, the modal opens and immediately fetches the preview (loading state shown).
- Modal displays:
  - A **tier badge** at the top (e.g. "Full Refund ✓", "Partial Refund", "Non-refundable").
  - A **segmented proportion bar** — colour-coded bands for refund / fee / credit across 100% of the price.
  - **Line items** with per-row icons: refund (arrow-return), fee (x-circle), travel credit (ticket).
  - A **"You'll receive back" summary row** (net cash refund) separated by a divider.
- If the preview fetch fails, the modal falls back to a plain "are you sure?" message and still allows cancellation.
- Existing cancel confirmation flow (`handleConfirmCancel`) is unchanged.

**Todo List**
1. Add state: `cancelPreview: CancellationPreview | null` and `previewLoading: boolean` and `previewError: boolean`.
2. In `handleCancelClick`, after setting `bookingToCancel`, trigger an async fetch of `getCancellationPreview(bookingId)`; set `previewLoading` true before, false after; populate `cancelPreview` on success or set `previewError` on failure.
3. Inside the modal JSX (currently lines 252–276 of `MyBookings.tsx`):
   - While `previewLoading`: show a spinner or skeleton.
   - When `cancelPreview` is set: replace the plain message with the breakdown UI described above.
   - When `previewError`: show the original "are you sure?" fallback message.
4. Implement the **tier badge** as a small coloured pill using Tailwind classes (green for full refund, amber for partial, red for non-refundable / forfeit).
5. Implement the **segmented bar** as a `<div>` with three child `<div>`s each given a percentage width equal to `(amount / total_price * 100)%` and a distinct background colour.
6. Implement **line items** with an icon column and amount column; format amounts as currency (e.g. `$1,234.56`).
7. Add a **divider** (`<hr>`) before a "You'll receive back" bold summary row showing `refund_amount`.

**Relevant Context**
- `booking_system_frontend/src/pages/MyBookings.tsx` lines 252–276 — existing modal JSX to be extended.
- `booking_system_frontend/src/pages/MyBookings.tsx` lines 92–120 — `handleCancelClick` and `handleConfirmCancel` to be updated.
- `booking_system_frontend/tailwind.config.js` — use space-themed palette tokens; do not assume standard Tailwind color names.
- `booking_system_frontend/src/services/api.ts` — import `getCancellationPreview`.

---

## Route Registration Order (Critical)

Per AGENTS.md footgun and issue notes: `GET /bookings/{booking_id}/cancellation-preview` **must** be registered before `GET /bookings/{user_id}` in `server.py`. FastAPI matches in registration order; the two-segment path `/bookings/{id}/cancellation-preview` would be shadowed by the single-segment wildcard `/bookings/{user_id}` if registered after it.

---

## Verification

After implementation, run:
```bash
cd booking_system_backend && python -m pytest tests/ -v
```
Frontend type-check:
```bash
cd booking_system_frontend && npm run build
```
