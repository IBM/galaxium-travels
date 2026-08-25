# Refund Preview on Cancel — Reviewed Plan

> Closes GitHub Issue #43  
> Status: **Draft · Reviewed**

---

## Summary

Add a cancellation-policy preview to the cancel modal in `MyBookings.tsx`. Before confirming a cancellation, the user sees a tier badge, colour-coded proportion bar, per-row breakdown, and a net-cash summary. The backend owns all policy logic via `GET /bookings/{id}/cancellation-preview`; actual refund processing is out of scope. Three key decisions were made during review: route ordering will be enforced with an inline protective comment, the tier helper will use `timedelta.days` integer-floor with a documented docstring, and frontend error handling uses a single generic fallback for all failure modes.

---

## Key Decisions

| Decision                            | Choice                                                                                                                                                                         | Rationale                                                                                                             |
| -------------------------------------| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| -----------------------------------------------------------------------------------------------------------------------|
| Route ordering enforcement          | Add inline comment above `GET /bookings/{user_id}`: *"NOTE: /bookings/{id}/cancellation-preview must be registered above this route — FastAPI matches in registration order."* | Prevents silent shadowing without adding test complexity; makes the footgun self-documenting.                         |
| Days-to-departure calculation       | `timedelta.days` integer floor                                                                                                                                                 | Matches the policy table exactly, keeps the helper simple; rounding behaviour documented in the function's docstring. |
| Frontend error fallback granularity | Single generic fallback for all errors (network, 404, etc.)                                                                                                                    | Keeps the UI simple; the cancel endpoint itself returns a proper error if the booking is already gone.                |

---

## Open Items

- No integration/e2e tests planned for the new endpoint — consider adding a smoke test to `e2e/test_smoke.py` if the endpoint is agent-accessible.
- `datetime.utcnow()` is deprecated in Python 3.12+; plan uses it for now but a future cleanup should switch to `datetime.now(timezone.utc)`.
- Icon library for the frontend breakdown rows (arrow-return, x-circle, ticket) needs to be confirmed against existing imports in `BookingCard.tsx` before implementation.

---

## Next Steps

1. **Sub-Task 1** — Add `CancellationPreview` Pydantic schema to `schemas.py`; implement `compute_cancellation_preview` pure helper and `get_cancellation_preview` service wrapper in `booking.py`.
2. **Sub-Task 2** — Register `GET /bookings/{id}/cancellation-preview` in `server.py` **before** the `GET /bookings/{user_id}` wildcard; add the protective inline comment above that wildcard.
3. **Sub-Task 3** — Write `pytest` unit tests covering all four tiers and both date string formats; confirm all tests pass.
4. **Sub-Task 4** — Add `CancellationPreview` TypeScript interface to `types/index.ts` and `getCancellationPreview` function to `api.ts`.
5. **Sub-Task 5** — Replace the cancel modal body in `MyBookings.tsx` with tier badge, proportion bar, per-row breakdown, and summary row; handle loading spinner and error fallback; run frontend lint/typecheck.
