# Refund Preview on Cancel — Reviewed Plan

**Status:** Draft · Reviewed  
**Issue:** #43 · tier-3 · enhancement  
**Estimate:** ~1 hour  
**Labels:** area/frontend, enhancement, roadmap  
**Out of scope:** actual refund processing (payment stub)

---

## Summary

The plan is sound. The cancel modal will block on the preview fetch before opening — simpler state management and acceptable latency for this demo. All amounts are stored as whole-credit integers and displayed as `$` + comma-formatted values, matching the existing `BookingCard` format. The new `GET /bookings/{booking_id}/cancellation-preview` endpoint uses `Depends(get_db)` and is auto-wrapped by `FastApiMCP`; no separate MCP tool is needed since it is a read-only endpoint.

---

## Key Decisions

| Decision              | Choice                                                   | Rationale                                                                                 |
| -----------------------| ----------------------------------------------------------| -------------------------------------------------------------------------------------------|
| Modal open timing     | Block on preview fetch, then open modal                  | Simpler state management; acceptable latency for demo                                     |
| Amount display format | `$` prefix + comma-formatted integer (e.g. `$1,500,000`) | Matches existing `BookingCard` display; `price_paid` is stored as whole credits           |
| MCP tool registration | FastApiMCP auto-wrapping is sufficient                   | Endpoint is read-only; manual `SessionLocal()` tool only needed for write/bypass patterns |

---

## Open Items

- Route ordering risk (`GET /bookings/{booking_id}/cancellation-preview` vs `GET /bookings/{user_id}`) is a **non-issue** — both existing path params are typed `int`; FastAPI will prefer the static string segment `/cancellation-preview` over a bare `int` param. No special ordering required.
- Departure time format varies by data source — tests use `"YYYY-MM-DD HH:MM"` but the live/seeded DB stores ISO 8601 (`"YYYY-MM-DDTHH:MM:SSZ"`). The service function must try both formats; hardcoding a single `strptime` pattern will break on real data.
- Confirm button must remain enabled even if preview fetch fails — user can still proceed to cancel.
- No changes to `models.py`, `db.py`, `seed.py`, `conftest.py`, or any Java service files.

---

## Next Steps

1. Add `CancellationPreview` Pydantic model to `booking_system_backend/schemas.py`
2. Add `get_cancellation_preview()` function to `booking_system_backend/services/booking.py` (pure read, below `cancel_booking()`)
3. Add `GET /bookings/{booking_id}/cancellation-preview` endpoint to `booking_system_backend/server.py` (place before `GET /bookings/{user_id}`)
4. Add `TestCancellationPreview` class with 6 test cases to `booking_system_backend/tests/test_services.py`
5. Add `CancellationPreview` TypeScript interface to `booking_system_frontend/src/types/index.ts`
6. Add `getCancellationPreview()` API function to `booking_system_frontend/src/services/api.ts`
7. Rewrite cancel modal in `booking_system_frontend/src/pages/MyBookings.tsx` — fetch preview on cancel click, block modal open, render breakdown table with `policy_wording` + three amount rows

---

## Cancellation Policy Tiers

| Days to departure | Refund % | Fee % | Travel credit % | Wording |
|---|---|---|---|---|
| > 30 days | 90% | 10% | 0% | Full refund less cancellation fee |
| 8–30 days | 50% | 20% | 30% | Partial refund; remainder as travel credit |
| 0–7 days | 0% | 25% | 75% | No refund; fare kept as travel credit less fee |
| Past / departed | 0% | 100% | 0% | Non-refundable — flight has departed |

---

## File Change Summary

| File | Change type | What changes |
|---|---|---|
| `booking_system_backend/schemas.py` | Add | New `CancellationPreview` Pydantic model |
| `booking_system_backend/services/booking.py` | Add | New `get_cancellation_preview()` function |
| `booking_system_backend/server.py` | Add | New `GET /bookings/{id}/cancellation-preview` endpoint + import |
| `booking_system_backend/tests/test_services.py` | Add | `TestCancellationPreview` class — 6 test cases |
| `booking_system_frontend/src/types/index.ts` | Add | New `CancellationPreview` interface |
| `booking_system_frontend/src/services/api.ts` | Add | New `getCancellationPreview()` function + import |
| `booking_system_frontend/src/pages/MyBookings.tsx` | Modify | Preview fetch on cancel click; breakdown in modal body |

---

*Made with IBM Bob*
