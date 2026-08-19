# Refund Preview on Cancel — Planning Document

**Status:** Draft · Reviewed

---

## Summary

The cancel modal will open immediately on click with an inline spinner while the preview fetch runs, ensuring no blocking delay before user feedback. The backend service will use a second explicit `db.query(Flight)` lookup (matching the existing `cancel_booking` pattern) rather than introducing an ORM relationship to `Booking`. Departures already in the past are treated as same-day (0 days), yielding the no-refund tier — simple and consistent with the defined policy.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Modal open timing | Open immediately with inline spinner | More responsive feel; user gets immediate feedback before the fetch resolves |
| Flight data access in service | Second explicit `db.query(Flight)` lookup | Matches the existing `cancel_booking` pattern; avoids any model change |
| Past-departure handling | Treat as same-day (0 days) → no refund | Simplest logic; consistent with the policy tiers |

---

## Open Items

- Currency formatting in the modal: check `formatters.ts` for an existing formatter before adding a new one; do not assume standard Tailwind color names for amount rows.
- The `FastApiMCP` auto-registration behaviour should be verified for the new `GET` endpoint — follow the explicit MCP tool registration pattern used elsewhere in `server.py` to avoid double-registration.
- `departure_time` is a raw `String` column in both `Flight` and the test fixtures — ensure the datetime normalisation (`Z` → `+00:00`) is applied before `datetime.fromisoformat()` in all paths.

---

## Next Steps

1. Add `CancellationPreviewOut` Pydantic schema to `schemas.py`
2. Add `compute_cancellation_policy()` pure function and `get_cancellation_preview()` service function to `services/booking.py`; handle both ISO 8601 and space-separated datetime formats; treat past departures as day 0
3. Add `GET /bookings/{booking_id}/cancellation-preview` REST endpoint and explicit MCP tool to `server.py`
4. Write `TestCancellationPreview` unit tests in `test_services.py` covering all four policy tiers, both datetime formats, unknown booking ID, and past-departure edge case
5. Add `CancellationPreview` TypeScript interface to `types/index.ts` and `getCancellationPreview` function to `api.ts`
6. Update cancel modal in `MyBookings.tsx`: open immediately on click, show inline spinner during fetch, display refund / fee / travel-credit breakdown (or "No refund" for same-day), keep "Keep Booking" / "Cancel Booking" buttons with graceful degradation if preview fetch fails
