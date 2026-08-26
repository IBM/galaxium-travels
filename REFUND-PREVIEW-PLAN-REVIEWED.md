# Refund Preview on Cancel — Reviewed Plan

**GitHub Issue:** #43
**Branch:** dev-day-demo-q3-2026-mj-09
**Status:** Draft · Reviewed

---

## Summary

The plan adds a `GET /bookings/{id}/cancellation-preview` endpoint that computes a refund/fee/credit breakdown based on days-to-departure, and updates the cancel modal in `MyBookings.tsx` to fetch and display that breakdown before confirmation. The modal opens **immediately** with a loading skeleton inside rather than blocking the click — giving faster perceived response. Backend tier logic uses Python's `.days` (integer floor), which is correct for day-granular policy. Route registration order is handled by registering the preview route before `GET /bookings/{user_id}`, accepted as the established footgun pattern in AGENTS.md.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Cancel modal UX pattern | Open modal immediately with loading skeleton inside | Faster perceived response; no blocked click waiting for fetch |
| Days-to-departure boundary calculation | Use `timedelta.days` (integer floor) | Simpler; policy tiers are already day-granular; no edge-case arithmetic needed |
| Route ambiguity (`/{id}` vs `/{id}/cancellation-preview`) | Register preview route first; keep path as-is | Matches existing AGENTS.md footgun pattern; avoids path rename that would break frontend/MCP contracts |

---

## Open Items

- Actual refund processing remains a stub — payment system integration is out of scope for this plan
- Same-day (0 days) tier results in total forfeit (0% refund, 0% fee, 0% credit) — confirm this edge case is handled gracefully in the UI copy
- The `isErrorResponse` guard in `api.ts` must be used for the preview fetch result to avoid silent failures
- `previewError` state in the modal needs a clear fallback UX (plain confirmation without breakdown)

---

## Next Steps

1. Add `compute_cancellation_preview()` helper to `booking_system_backend/services/booking.py` with multi-format date parser and four policy tiers
2. Add `CancellationPreviewOut` Pydantic schema to `booking_system_backend/schemas.py`
3. Write unit tests covering all 4 tiers + ISO-Z format in `tests/test_services.py`
4. Add `get_booking_by_id()` helper and `GET /bookings/{booking_id}/cancellation-preview` route to `server.py` — registered **above** `GET /bookings/{user_id}`
5. Register matching MCP tool for the preview endpoint
6. Add REST tests in `tests/test_rest.py` (valid booking → 200, unknown ID → 404)
7. Add `CancellationPreview` TypeScript interface and `getCancellationPreview()` to `api.ts`
8. Update cancel modal in `MyBookings.tsx`: open immediately, fetch preview in parallel, show skeleton → breakdown using Lucide icons and space-themed Tailwind tokens
