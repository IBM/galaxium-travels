# Refund Preview on Cancel — Reviewed Plan

**Status:** Draft · Reviewed  
**Issue:** #43  
**Branch:** `dev-day-demo-q3-2026-mj-10`

---

## Summary

The refund-preview cancel modal replaces the generic "are you sure?" prompt with a rich breakdown showing tier badge, per-line-item amounts, and a proportion bar. The fee band in the proportion bar uses `nebula-pink` (the only warm/negative-signal colour in the custom Tailwind palette). Same-day (0%) cancellations skip the proportion bar and display a prominent "Non-refundable" warning banner instead. On preview fetch failure, the UI retries once after 2 seconds, then re-enables the Cancel button with plain fallback copy — users are never blocked indefinitely.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Fee band colour in proportion bar | `nebula-pink` (#EC4899) | No red token exists in the custom Tailwind palette; nebula-pink is the only warm/negative-signal colour available |
| Same-day (0%) tier UX | Prominent "Non-refundable" banner + hide proportion bar | A zero-value bar conveys nothing; an explicit banner is the clearest UX signal |
| Fallback when preview fetch fails | 2-second retry, then enable Cancel with plain fallback copy | Keeps the guard without blocking the user indefinitely if the endpoint is slow or unavailable |

---

## Open Items

- The FastAPI route registration order is a critical footgun — the new `GET /bookings/{booking_id}/cancellation-preview` route **must** be inserted immediately above the existing `GET /bookings/{user_id}` route at [`server.py:169`](booking_system_backend/server.py:169)
- `Ticket` icon availability in `lucide-react` should be verified before build; nearest equivalent (`Tag` or `Gift`) may be needed
- The `formatCurrency` formatter should be confirmed to handle zero amounts gracefully (same-day tier)
- No red Tailwind token — ensure nebula-pink reads as a "cost/negative" signal in the dark space theme to non-technical users

---

## Next Steps

1. Implement Sub-Task 1: `CancellationPreviewOut` schema → `get_cancellation_preview` service function → REST endpoint inserted at the correct line in `server.py`
2. Implement Sub-Task 2: unit tests covering all four tiers, both departure-time formats, 404, and 409 cases
3. Implement Sub-Task 3: `CancellationPreview` TypeScript interface + `getCancellationPreview` API call in `api.ts`
4. Implement Sub-Task 4: redesign cancel modal in `MyBookings.tsx` with tier badge, line items, proportion bar (`nebula-pink` for fee band), "Non-refundable" banner for same-day tier, and 2-second retry fallback
5. Run `pytest booking_system_backend/tests/` and `npm run lint` to confirm no regressions before opening PR
