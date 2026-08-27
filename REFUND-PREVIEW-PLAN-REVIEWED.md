# Refund Preview on Cancel — Reviewed Plan

> GitHub Issue #43 · Tier 3 · area/frontend + backend  
> Status: **Draft · Reviewed**

---

## Summary

The plan implements `GET /bookings/{id}/cancellation-preview` end-to-end: a pure policy helper in the backend, a REST endpoint registered before the `{user_id}` wildcard, and a redesigned cancel modal in `MyBookings.tsx`. The modal opens instantly with a spinner (loading-first UX), then renders the tier badge, segmented bar, and line items once the preview resolves — or falls back gracefully on error. The modal will be upgraded to `size="md"` unconditionally, and the forfeit/danger tier badge will use Tailwind's `red-500` since no red token exists in the custom space palette.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Modal size for preview state | Upgrade to `size="md"` unconditionally | `size="sm"` is too cramped for tier badge + segmented bar + line items; applies even on mobile |
| Preview fetch timing | Open modal instantly with spinner; fetch runs async inside | Avoids dead-click feel; matches plan's "loading state shown" intent; aligns with existing async pattern in `handleConfirmCancel` |
| Danger/forfeit tier badge colour | `red-500` (raw Tailwind) | No red token exists in the custom space palette (`space-dark`, `cosmic-purple`, `nebula-pink`, `alien-green`, `solar-orange`, `star-white`); `red-500` is universally readable as danger |

---

## Open Items

- **Same-day forfeit edge case:** Policy returns 0% refund / 0% fee / 0% credit for day-of travel. The segmented bar will render as fully empty — consider showing a single full-width grey band with "Total forfeit" label instead of three zero-width divs.
- **Currency formatting:** Plan specifies `$1,234.56` but Galaxium sells interplanetary flights — prices may be in the millions. Verify `toLocaleString` with `minimumFractionDigits: 2` handles large numbers cleanly in the UI.
- **`handleCancelClick` async refactor:** Currently synchronous; needs to become async or use a fire-and-forget pattern to trigger the fetch while immediately setting modal open. Must not change `handleConfirmCancel` behaviour.
- **Route registration order:** `GET /bookings/{booking_id}/cancellation-preview` **must** be inserted above `GET /bookings/{user_id}` in `server.py` (FastAPI matches registration order — critical footgun noted in AGENTS.md).
- **Test fixture gap:** `sample_flight_data` uses `"2099-01-01 09:00"` format; a separate fixture with seed format `"2099-01-01T09:00:00Z"` should be added to cover the real-world datetime parsing path.

---

## Next Steps

1. Add `CancellationPreview` Pydantic schema to `booking_system_backend/schemas.py`.
2. Implement `_parse_departure_time`, `_cancellation_policy`, and `get_cancellation_preview` in `booking_system_backend/services/booking.py`.
3. Register `GET /bookings/{booking_id}/cancellation-preview` in `server.py` **above** the `{user_id}` route (line 169).
4. Write backend unit tests: all four policy tiers, all three datetime formats, service-layer happy/not-found, REST happy/404.
5. Add `CancellationPreview` TypeScript interface to `booking_system_frontend/src/types/index.ts`.
6. Add `getCancellationPreview` to `booking_system_frontend/src/services/api.ts`.
7. Refactor `handleCancelClick` in `MyBookings.tsx` to be async: open modal immediately, trigger preview fetch, set loading/error state.
8. Upgrade cancel modal to `size="md"` and replace plain message with tier badge + segmented bar + line items (with `red-500` for forfeit tier).
9. Verify with `cd booking_system_backend && python -m pytest tests/ -v` and `cd booking_system_frontend && npm run build`.
