# Refund Preview on Cancel

**Status:** Draft · Reviewed  
**Issue:** [#43 — Refund preview on cancel](https://github.com/IBM/galaxium-travels/issues/43)  
**Size:** ~1 hour

## Summary

The new `GET /bookings/{id}/cancellation-preview` endpoint joins directly to the `Flight` table to retrieve `departure_time` — no changes to `BookingOut` are needed. The policy helper parses departure time by trying `datetime.fromisoformat` first, falling back to `"%Y-%m-%d %H:%M"`, covering both fixture and live-DB formats without silent failures. The cancel modal in `MyBookings.tsx` fetches the preview immediately on open (spinner → breakdown), so the user sees the refund/fee/credit split before confirming cancellation.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| How to get departure date in preview endpoint | Internal DB join to `Flight` table; no `BookingOut` schema change | Keeps the existing booking schema stable; the preview is a one-off read |
| Handling mixed `departure_time` formats | Try `datetime.fromisoformat` first, fall back to `"%Y-%m-%d %H:%M"` | Avoids silent parsing failures across fixture data and live ISO 8601 DB values |
| When to fetch preview in modal | Fetch immediately on modal open; show spinner then replace with breakdown | Users must see the breakdown *before* confirming — lazy-load would let them confirm blind |

## Open Items

- Actual refund processing is out of scope (payment system is a stub) — the preview is display-only.
- Same-day cutoff logic: "same-day" should be defined as departure date == today in UTC; confirm timezone handling is consistent with how the rest of the app treats departure times.
- Consider caching the preview response per `booking_id` for the lifetime of the modal (avoids duplicate requests if the modal is closed and reopened).

## Next Steps

1. Add `get_cancellation_policy(departure_time: str) -> dict` helper in `booking_system_backend/services/booking.py` with unit tests covering all four tiers and both date formats.
2. Add `GET /bookings/{id}/cancellation-preview` REST endpoint + matching MCP tool in `server.py`, joining to `Flight` for `departure_time`.
3. Add `getCancellationPreview(bookingId: number)` in `booking_system_frontend/src/services/api.ts`.
4. Update `MyBookings.tsx` cancel modal: fetch preview on open, show spinner, then render refund/fee/credit breakdown before the confirm button.
5. Run `pytest` on the backend unit tests; run frontend lint and type-check.
