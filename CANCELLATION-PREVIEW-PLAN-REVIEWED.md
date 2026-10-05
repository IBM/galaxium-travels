# Cancellation Preview Plan — Reviewed

**GitHub Issue:** #43 — Refund preview on cancel  
**Status:** Draft · Reviewed  
**Date:** 2026-07-03

---

## Summary

The cancel modal will gain a real-time policy breakdown before the user confirms cancellation. A new `GET /bookings/{id}/cancellation-preview` endpoint (backed by a `compute_cancellation_policy` service function) computes refund, fee, and travel-credit amounts from a `CANCELLATION_POLICY_TIERS` constant — the single source of truth for both runtime and test assertions. Price recovery is trivial: `booking.price_paid` is stored directly on the `Booking` model, removing the need for any multiplier math in the preview path. The frontend proportion bar will use the existing space-theme tokens (`alien-green` / `solar-orange` / `nebula-pink`) rather than generic Tailwind colour names that don't exist in the palette.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Policy tier definition | `CANCELLATION_POLICY_TIERS` constant (list of dicts) at top of `booking.py` | Single source of truth; tests assert against the same constant, not hardcoded numbers |
| Price used for calculations | Read `booking.price_paid` directly | `Booking` model already stores the final paid price; no multiplier reconstruction needed |
| Proportion bar colours | `alien-green` (refund) · `solar-orange` (fee) · `nebula-pink` (credit) | These are the only semantic colour tokens in the actual Tailwind config; generic names like `green` or `red` don't exist in the palette |

---

## Open Items

- The plan lists three departure-time formats to handle (`%Y-%m-%d %H:%M`, `%Y-%m-%dT%H:%M:%S`, `%Y-%m-%dT%H:%M:%SZ`). Confirm seed data and any test fixtures don't introduce a fourth format before Sub-Task 1 ships.
- Modal size (`sm` vs `md`) is deferred to implementation; content overflow with the proportion bar + line items may force `md` — decide during Sub-Task 5.
- Actual refund processing remains a stub; the preview is display-only. Add a visible disclaimer ("Preview only — no payment is processed") to the modal to avoid user confusion.

---

## Next Steps

1. Add `CancellationPreview` Pydantic schema to `schemas.py` and `CANCELLATION_POLICY_TIERS` constant to `booking.py`.
2. Implement `compute_cancellation_policy(price, departure_time_str)` using the tiers constant; write `TestCancellationPolicy` tests covering all four tiers and both date formats.
3. Implement `get_cancellation_preview(db, booking_id)` — read `booking.price_paid` directly (no multiplier math); add `TestGetCancellationPreview` for success / not-found / already-cancelled.
4. Register `GET /bookings/{id}/cancellation-preview` in `server.py` **before** `GET /bookings/{user_id}`; add matching MCP tool using `SessionLocal()` directly.
5. Add `CancellationPreview` TypeScript interface and `getCancellationPreview()` to `api.ts`.
6. Update `MyBookings.tsx` cancel modal: fetch preview on open, render tier badge + proportion bar (`alien-green` / `solar-orange` / `nebula-pink`) + line items + "You'll receive back" summary; include a "Preview only" disclaimer.
7. Run `pytest booking_system_backend/tests/ -v` and `npm run build` — both must pass clean.
