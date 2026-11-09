# Refund Preview on Cancel — Reviewed Plan (Issue #43)

Status: Draft · Reviewed. Source plan: [`REFUND_PREVIEW_PLAN.md`](REFUND_PREVIEW_PLAN.md).

## Summary

The cancel modal in `MyBookings.tsx` will show an **estimated** refund / fee / travel-credit breakdown, fetched from a new `GET /bookings/{booking_id}/cancellation-preview` endpoint. The backend owns the policy, and the endpoint is auto-exposed as an MCP tool. If the preview fails to load, the modal shows an inline error and still lets the user cancel. `cancel_booking` is unchanged and no money moves, so refund processing is a follow-up issue. All seed flights are in 2099, so unit tests inject "now" and the demo seed gains one or two near-term flights to show the other tiers.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Preview fetch failure in the modal | Show an inline error and still allow cancelling | A preview bug (network, unparseable `departure_time`) must never trap a user in a booking |
| Preview vs. actual cancel | Label the breakdown "Estimated". Leave `cancel_booking` unchanged. Log refund processing as a follow-up issue | Payment is a stub, so the UI must not imply money moves. This also keeps the change minimal |
| Demonstrating and testing non-"Full refund" tiers | Unit tests inject `now`. Seed one or two near-term flights (e.g. +2 and +5 days) for the demo | Seed flights are all in 2099, so the live UI would only ever show "Full refund" |
| 1–2 day tier percentages | 0% refund / 50% fee / 50% credit | The issue's 25%/25% adds up to only 50%, so it is treated as a typo and every tier sums to 100% |
| Policy location | Backend helper plus service function; frontend only renders | One tested source of truth, and the MCP tool gets the same logic |
| Departure-time parsing | Accept `%Y-%m-%d %H:%M`, `%Y-%m-%dT%H:%M:%S` and `...Z`. Treat naive values as UTC | The seed uses `Z` ISO strings, tests use space-separated strings, and the only existing parser would fail on seed data |

## Open Items

- Seeding near-term flights changes demo data. Check that `seed.py` and any tests or e2e flows that count flights or assume 2099 dates still pass.
- Seeded near-term flights will age: "+2 days" is relative to seed time, and `SEED_DEMO_DATA=true` re-seeds on every start. Confirm the seed computes dates relative to now rather than hardcoding them.
- Wording for the tier badge labels and policy text is a draft and needs a review in the UI.
- Whether the modal needs to grow from `sm` to fit the breakdown block.
- Refund and credit processing (real payment, recording amounts on the booking) is out of scope. File a follow-up issue.
- The frontend has no unit-test runner, so the UI is verified by typecheck, lint, build and a manual browser check.

## Next Steps

1. Backend: add the `CancellationPreview` schema, the departure-time parser, the policy helper and `get_cancellation_preview(db, booking_id, now=None)` in `services/booking.py`. Return `ErrorResponse` for `BOOKING_NOT_FOUND`, `ALREADY_CANCELLED` and an invalid date.
2. Backend tests: tier boundaries (7, 6, 3, 2, 1 days, same day and already departed), parts summing to `price_paid`, all three date formats, service error cases, and REST 200/404/409 tests.
3. Backend endpoint: add `GET /bookings/{booking_id}/cancellation-preview` in `server.py` above `get_user_bookings` and above `FastApiMCP(app)`. Set the response model and a docstring that states the policy tiers.
4. Seed: add one or two near-term flights (about +2 and +5 days) to `seed.py` so the partial and non-refundable tiers show up in the demo.
5. Frontend types and API: add the `CancellationPreview` type and `getCancellationPreview` in `api.ts`.
6. Frontend UI: add a `CancellationBreakdown` component with a tier badge, a segmented bar, per-row icons, a "You'll receive back" row and an "Estimated" label. Handle loading and error states, still allow cancelling on error, and reset state on close.
7. Verify with the `verify` skill (ruff, mypy, pytest, `tsc -b`, eslint, build), then check the modal manually against `./start.sh`.
8. Open a follow-up issue for actual refund processing.
