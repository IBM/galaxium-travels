# Refund Preview on Cancel — Implementation Plan (Issue #43)

Source: [IBM/galaxium-travels#43](https://github.com/IBM/galaxium-travels/issues/43) "Refund preview on cancel" (labels: enhancement, roadmap, tier-3, area/frontend).

## Top-Level Overview

**Goal:** Before a user confirms a cancellation, the cancel modal in `MyBookings.tsx` shows a refund / fee / travel-credit breakdown driven by a cancellation policy, with a policy-tier badge, a segmented proportion bar, per-row icons and a "You'll receive back" summary row.

**Approach:**
1. Backend owns the policy. A pure policy helper maps days-to-departure and price paid to a breakdown.
2. A service function loads the booking and flight, parses the departure time, and calls the helper.
3. A new `GET /bookings/{booking_id}/cancellation-preview` REST endpoint exposes it. It is auto-exposed as an MCP tool by `FastApiMCP`.
4. The frontend fetches the preview when the cancel modal opens and renders the breakdown.

**Out of scope:** actual refund processing (payment is a stub). `cancel_booking` itself is not changed.

### Policy (decided with the user)

The issue's 1–2 day tier ("no refund + 25% fee + 25% credit") only adds up to 50%. **Decision: treat it as a typo and use 0% refund / 50% fee / 50% credit** so every tier adds up to 100%.

| Days to departure | Tier | Refund | Fee | Travel credit |
|---|---|---|---|---|
| 7 or more | Full refund | 100% | 0% | 0% |
| 3–6 | Partial refund | 75% | 10% | 15% |
| 1–2 | Non-refundable | 0% | 50% | 50% |
| Same day (under 1 day, including already departed) | Total forfeit | 0% | 0% | 0% (full price forfeited) |

- Same-day has no refund, fee or credit, so the whole price is forfeited. Add a `forfeited` amount so the proportion bar can show it as its own band.
- "Days to departure" is computed from full datetime difference (floor of whole days), not calendar dates. Tier boundaries are the thing to unit-test.
- Amounts are integers like `price_paid`. Compute refund and fee by rounding, and derive credit as the remainder for tiers that add up to 100%, so the parts always sum to `price_paid`.

### Data-shape risks found in research

- `Flight.departure_time` is a plain `String` column ([`models.py`](booking_system_backend/models.py:25)).
- `seed.py` writes ISO 8601 with a `Z` suffix, e.g. `"2099-01-03T12:00:00Z"` ([`seed.py`](booking_system_backend/seed.py:40)).
- The test fixtures in `tests/test_services.py` use `"YYYY-MM-DD HH:MM"`.
- The only existing parser is a single `strptime("%Y-%m-%d %H:%M")` in `services/flight.py:187`. It would fail on live seed data.
- The new parser must handle all three formats: `%Y-%m-%d %H:%M`, `%Y-%m-%dT%H:%M:%S`, `%Y-%m-%dT%H:%M:%SZ`. Treat naive values as UTC.
- All seed flights are in 2099, so the live tier will always be "7+ days" in the demo unless data is changed. Tests must inject "now" instead of relying on seed dates.

### Route-order note

The issue says to register the new route before `GET /bookings/{user_id}`. `{user_id}` is an `int` path param and does not match across `/`, so the two-segment path would not actually be shadowed. Registering it just above `get_user_bookings` is still harmless and matches the issue, so do that. Either way it must be above `FastApiMCP(app)` (`server.py:336`).

## Sub-Tasks

### 1. Backend: policy helper, date parsing and service function

**Intent:** Put the cancellation policy and departure-time parsing in one tested place in the backend.

**Expected Outcomes:**
- A pure function turns `(price_paid, days_to_departure)` into a tier, a refund / fee / credit / forfeited breakdown, and policy wording.
- A parser accepts all three departure-time formats and returns a timezone-aware UTC datetime.
- A service function returns a preview for a booking id, or an `ErrorResponse` (union-return convention). The error cases are `BOOKING_NOT_FOUND`, `ALREADY_CANCELLED` and an invalid-flight/date case.
- A Pydantic response schema describes the preview.

**Todo List:**
1. Add a `CancellationPreview` schema to `schemas.py`. Fields: `booking_id`, `tier` (a Literal such as `full_refund` / `partial_refund` / `non_refundable` / `forfeit`), `tier_label`, `policy_text`, `days_until_departure`, `price_paid`, `refund`, `fee`, `credit`, `forfeited`. Possibly `departure_time`.
2. Add a departure-time parser in `services/booking.py`. Try the three formats in order and treat naive values as UTC. If none match, return an `ErrorResponse` with a new error code.
3. Add the policy helper in `services/booking.py`: tier selection by day thresholds (7+, 3–6, 1–2, under 1) and the percentage table above. Parts must sum to `price_paid`.
4. Add `get_cancellation_preview(db, booking_id, now=None)` returning `CancellationPreview | ErrorResponse`. The optional `now` is for tests. Reuse the not-found and already-cancelled checks and messages from `cancel_booking`.
5. Do not change `cancel_booking`.

**Relevant Context:**
- [`booking_system_backend/services/booking.py`](booking_system_backend/services/booking.py): `cancel_booking`, `SEAT_CLASS_MULTIPLIERS` and the union-return pattern (`BookingOut | ErrorResponse`).
- [`booking_system_backend/schemas.py`](booking_system_backend/schemas.py): `BookingOut`, `ErrorResponse`.
- [`booking_system_backend/models.py`](booking_system_backend/models.py): `Booking`, `Flight` (`departure_time` is a string).
- Project footgun: service functions return `ErrorResponse`, they do not raise. Callers check `isinstance`.

**Status:** `[ ] pending`

### 2. Backend: unit and REST tests

**Intent:** Meet the "policy helper is unit-tested" acceptance criterion and guard the date-format risk.

**Expected Outcomes:**
- Tier-boundary tests: 7, 6, 3, 2, 1 days, and under 1 day / already departed.
- Parts sum to `price_paid` for every tier, including prices that don't divide evenly.
- A test uses the exact seed format (`"2099-01-03T12:00:00Z"`), plus the naive `"YYYY-MM-DD HH:MM"` and `"...T...:SS"` forms.
- Service tests for booking-not-found and already-cancelled.
- REST tests for the new endpoint: 200 with the breakdown, 404 not found, 409 already cancelled.

**Todo List:**
1. Add a test class for the policy helper and parser to `tests/test_services.py`. Use a fixed `now` instead of the real clock.
2. Add service-level preview tests next to the existing `TestBookingService` cancel tests.
3. Add `TestCancellationPreviewEndpoint` to `tests/test_rest.py`, modelled on `TestCancelEndpoint`.

**Relevant Context:**
- [`booking_system_backend/tests/test_services.py`](booking_system_backend/tests/test_services.py): `TestBookingService` (cancel tests around line 370).
- [`booking_system_backend/tests/test_rest.py`](booking_system_backend/tests/test_rest.py): `TestCancelEndpoint` (line 369).
- [`booking_system_backend/tests/conftest.py`](booking_system_backend/tests/conftest.py): `db_session` and `client` fixtures. Tests use `dependency_overrides` with an in-memory DB, so use `Depends(get_db)` only and never call `SessionLocal()` directly.

**Status:** `[ ] pending`

### 3. Backend: REST endpoint (and MCP tool)

**Intent:** Expose the preview over HTTP, and automatically as an MCP tool.

**Expected Outcomes:**
- `GET /bookings/{booking_id}/cancellation-preview` returns `CancellationPreview`.
- Error mapping follows `cancel_booking_endpoint`: 404 for `BOOKING_NOT_FOUND`, 409 for other errors, with `detail=result.model_dump()`.
- The route is registered above `FastApiMCP(app)` and above `get_user_bookings`, and appears in the OpenAPI/MCP tool list.

**Todo List:**
1. Add the handler in `server.py` just above `get_user_bookings` (line 169), with tag `Bookings` and a docstring that states the policy tiers. fastapi-mcp uses the docstring as the tool description.
2. Make sure the response model is set, so the MCP tool gets an output schema.
3. Verify the route is present in `/openapi.json`, and that the existing `/bookings/{user_id}` route still works.

**Relevant Context:**
- [`booking_system_backend/server.py`](booking_system_backend/server.py:169): `get_user_bookings`, `cancel_booking_endpoint` (line 175), `FastApiMCP(app)` (line 336).
- No hand-written MCP tool is needed.

**Status:** `[ ] pending`

### 4. Frontend: types and API client

**Intent:** Give the UI a typed way to fetch the preview.

**Expected Outcomes:**
- A `CancellationPreview` type in `types/index.ts` matching the backend schema.
- `getCancellationPreview(bookingId)` in `services/api.ts`, following the style of `cancelBooking`.

**Todo List:**
1. Add the `CancellationPreview` interface to `types/index.ts`.
2. Add `getCancellationPreview` to `api.ts`, calling `GET /bookings/${bookingId}/cancellation-preview`.
3. The response interceptor already rejects with `error.response.data`, so callers handle `ErrorResponse` in the catch path, as `handleConfirmCancel` does.

**Relevant Context:**
- [`booking_system_frontend/src/services/api.ts`](booking_system_frontend/src/services/api.ts:140): `cancelBooking`, `isErrorResponse`.
- [`booking_system_frontend/src/types/index.ts`](booking_system_frontend/src/types/index.ts): `Booking`, `ErrorResponse`.
- Project convention: inspect the `success` field or the `error` key, not the HTTP status.

**Status:** `[ ] pending`

### 5. Frontend: cancel modal breakdown UI

**Intent:** Show the preview in the cancel modal so the user sees what they get back before confirming.

**Expected Outcomes:**
- Opening the modal fetches the preview for `bookingToCancel`. It shows a loading state, then the breakdown.
- Breakdown block, per the issue's design notes:
  - Policy tier badge at the top, e.g. "Full Refund ✓" or "Non-refundable".
  - Segmented proportion bar with refund / fee / credit (and forfeited) bands, colour-coded.
  - Per-row icons (e.g. `Undo2` for refund, `XCircle` for fee, `Ticket` for credit) with `formatCurrency` amounts.
  - A divider, then a "You'll receive back" row showing the net cash refund.
  - Short cancellation-policy wording for the applicable tier.
- If the preview fails, the modal shows an error message and still lets the user cancel, or disables confirm. The choice is for the implementer to confirm with the user.
- Stale preview data is cleared when the modal closes or a different booking is chosen.
- The modal size may need to grow from `sm` to fit the block.

**Todo List:**
1. Add preview state (data, loading, error) to `MyBookings.tsx`. Fetch in `handleCancelClick`, or in an effect keyed on the open modal and booking id. Guard against out-of-order responses.
2. Extract the breakdown into a small presentational component under `src/components/bookings/` (for example `CancellationBreakdown.tsx`), so `MyBookings.tsx` stays readable.
3. Use the project's custom Tailwind palette from `tailwind.config.js` for the bands. Do not assume default Tailwind colour names.
4. Use `lucide-react` icons, which the codebase already uses. Use `formatCurrency` from `utils/formatters`.
5. Make the bar and badge accessible: text labels, not colour alone, and `aria-label`s.
6. Reset preview state on close and after confirm.

**Relevant Context:**
- [`booking_system_frontend/src/pages/MyBookings.tsx`](booking_system_frontend/src/pages/MyBookings.tsx:252): cancel modal, `handleCancelClick` (line 92), `handleConfirmCancel` (line 97).
- [`booking_system_frontend/src/components/bookings/BookingCard.tsx`](booking_system_frontend/src/components/bookings/BookingCard.tsx): style reference for lucide icons, `formatCurrency` and glass-card styling.
- [`booking_system_frontend/tailwind.config.js`](booking_system_frontend/tailwind.config.js): custom space palette.
- `Modal`, `Button`, `LoadingSpinner` from `components/common`.

**Status:** `[ ] pending`

### 6. Verification

**Intent:** Confirm the change works end to end and doesn't break other checks.

**Expected Outcomes:**
- Backend ruff, mypy (no new errors) and pytest all pass.
- Frontend `tsc -b` and `eslint` pass, and the build succeeds.
- Manual check against a locally running stack: the modal shows the breakdown for a seeded 2099 booking (full refund tier), and the amounts match the booking price.

**Todo List:**
1. Use the `verify` skill. Run the cheap checks (ruff, pytest, frontend lint/typecheck) after each sub-task. The lifecycle hooks in `.bob/settings.json` also run them after edits.
2. Run e2e only if requested. The change doesn't touch cross-service boundaries.
3. Manually exercise the modal through the browser against `./start.sh`.
4. Check that `SEED_DEMO_DATA=true` re-seeds on start, so local data may reset.

**Relevant Context:**
- Frontend has no unit-test runner (`package.json` has only `lint`, plus the build scripts), so the UI is verified by typecheck, lint, build and a manual check.
- Hooks block commits while the backend suite is red.

**Status:** `[ ] pending`

## Open Questions for Implementation

- Preview fetch failure in the modal: allow cancelling anyway, or block confirm? Default proposal: show an inline error and still allow cancel.
- Wording for the policy text and tier badge labels: a draft is in sub-task 1, to be reviewed in the UI.
