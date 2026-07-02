# Issue #44 — Calendar Export (.ics) for Bookings

**Status:** Draft · Reviewed  
**Scope:** ~1 hour · 4 files touched · no new dependencies

---

## Summary

The plan is solid and implementation-ready across four files: a new `get_booking_ics()` service function, a REST endpoint plus MCP tool in `server.py`, and an "Add to Calendar" button in `BookingCard.tsx`. Three concrete decisions were made during review: the two action buttons will sit 50/50 side-by-side using `flex-1`; datetime strings will be normalised via a simple `.replace()` chain before `fromisoformat()` with no defensive try/except; and the frontend download URL will reuse the `API_BASE_URL` constant already exported from `api.ts`, ensuring both dev (Vite proxy) and production routing work without any path prefix issues.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Button layout in `BookingCard.tsx` | 50/50 split — `flex gap-2`, each button gets `flex-1`. No `w-full` on either. Cancel = `variant="danger"`, Add to Calendar = `variant="secondary"`. Both `size="sm"`. | Cancel button is currently full-width; a side-by-side layout requires removing the width class and sharing space. 50/50 is the least-surprise choice for two equal-priority actions. |
| Datetime normalisation strategy | Call `.replace("Z", "").replace("+00:00", "")` before `fromisoformat()`; append `Z` to the formatted `YYYYMMDDTHHMMSSZ` output. No try/except. | Conftest seeds times as `"2099-01-01 09:00"` (no Z, space-separated). Seed data and any reasonable ISO-8601 variant are handled by the strip chain. Keeping it minimal is appropriate for a demo codebase. |
| Frontend download URL construction | Import `API_BASE_URL` from `api.ts` and construct `` `${API_BASE_URL}/bookings/{id}/export.ics` ``. | `api.ts` already resolves `VITE_API_URL \|\| '/api'`. Using the same constant ensures the Vite dev proxy forwards correctly and production works without a hardcoded path prefix. |

---

## Open Items

- **RFC 5545 line folding:** The plan builds the iCal string manually. Long `DESCRIPTION` lines (booking ID + seat class + price + flight ID) could exceed the 75-octet RFC limit. Not a compliance blocker for demo use, but worth a note in code comments.
- **`Response` import:** `Response` is not yet imported in `server.py`. Must be added to the `from fastapi import …` line at line 2.
- **`CalendarPlus` icon availability:** `lucide-react` is in the project but `CalendarPlus` was not verified to exist in the pinned version. Confirm the icon name before implementation or fall back to `Calendar` (already imported in `BookingCard.tsx`).
- **Test seeding re-use:** `test_rest.py` may not have a `seed_user_flight_booking` helper — check whether `TestIcsEndpoint` can reuse existing fixtures or needs its own seeding logic.

---

## Next Steps

1. Add `get_booking_ics(db, booking_id) → str | ErrorResponse` to `booking_system_backend/services/booking.py`, using `.replace()` normalisation for datetimes and explicit `\r\n` line endings.
2. Add `Response` to the `fastapi` import line in `server.py`, then add the `GET /bookings/{booking_id}/export.ics` endpoint and the matching `@mcp.tool()` — both above line 108.
3. In `BookingCard.tsx`: import `API_BASE_URL` from `api.ts` and (verify then) import `CalendarPlus` from `lucide-react`; add `handleAddToCalendar`; wrap both buttons in `flex gap-2` with `flex-1`, removing `w-full` from Cancel.
4. Write `TestBookingIcsService` (2 tests) in `test_services.py` and `TestIcsEndpoint` (2 tests) in `test_rest.py`.
5. Run `cd booking_system_backend && pytest` — all tests must pass before raising a PR.
