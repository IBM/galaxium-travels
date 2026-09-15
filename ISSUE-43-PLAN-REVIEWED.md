# Issue #43 — Refund Preview on Cancel: Reviewed Plan

**Status:** Draft · Reviewed  
**Date:** 2026-07-09

---

## Summary

The same-day zero-payout policy (0% refund / 0% fee / 0% travel credit) is approved and intentional. The cancel modal opens immediately when the user clicks "Cancel Booking", with an inline spinner while the preview loads asynchronously — no delayed modal open. `price_paid` accepts `float` and all returned dollar amounts are rounded to 2 decimal places to match real pricing.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Same-day cancellation payout | 0 / 0 / 0 (nothing returned) | Policy is documented and approved; no exceptions |
| Modal loading UX | Open immediately, spinner inside | Better UX on slow connections; avoids perceived hang |
| `price_paid` data type | `float`, amounts rounded to 2 d.p. | Matches real-world pricing (e.g. $249.99) |

---

## Open Items

- `departure_time` format ambiguity (`"YYYY-MM-DD HH:MM"` vs ISO 8601 `"YYYY-MM-DDTHH:MM:SSZ"`) must be handled in both Sub-Task 1 and Sub-Task 2 — confirm `dateutil` is available in `requirements.txt` or use `fromisoformat` fallback pattern.
- `calculate_cancellation_preview` signature in Sub-Task 1 is typed as `int` — update to `float` before implementation begins.
- Sub-Task 5 wording: modal description says fetch preview "before" showing modal — superseded by decision above; update task wording to avoid confusion.

---

## Next Steps

1. Update `calculate_cancellation_preview` signature to `price_paid: float` in plan and implementation.
2. Implement Sub-Task 1: pure helper function + boundary unit tests.
3. Implement Sub-Task 2: `get_cancellation_preview` service + `CancellationPreviewOut` schema.
4. Implement Sub-Task 3: REST endpoint + MCP tool in `server.py`.
5. Implement Sub-Task 4: TypeScript type + `getCancellationPreview` API helper.
6. Implement Sub-Task 5: update `MyBookings.tsx` to open modal immediately and render spinner → breakdown.
7. Run full `pytest` suite and `npm run build` to confirm clean.
