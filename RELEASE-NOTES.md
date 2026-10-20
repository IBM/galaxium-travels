# Release Notes: Calendar Export for Bookings

Commit `304a62c` · Issue [#44](https://github.com/IBM/galaxium-travels/issues/44)

## Highlights

Travelers can now add a booked flight to their calendar. Each active booking on the My Bookings page has an **Add to Calendar** button that downloads an iCalendar (`.ics`) file. The file opens in Apple Calendar, Google Calendar, Outlook and other RFC 5545-compatible apps.

## What's new

### Backend
- **New endpoint:** `GET /bookings/{booking_id}/export.ics`
  - Returns `Content-Type: text/calendar` with `Content-Disposition: attachment; filename="booking-{id}.ics"`.
  - The file contains one `VEVENT` for the flight, with these fields:

    | Field | Value |
    |---|---|
    | `UID` | `booking-{id}@galaxium-travels` |
    | `DTSTART` / `DTEND` | Flight departure / arrival, normalized to UTC |
    | `SUMMARY` | `Flight from {origin} to {destination}` |
    | `LOCATION` | `{origin} → {destination}` |
    | `DESCRIPTION` | Booking ID, Flight ID, seat class, price paid |

  - Output follows RFC 5545: special characters are escaped, and lines over 75 octets are folded with UTF-8 safety.
  - Flight times in `YYYY-MM-DD HH:MM[:SS[.ffffff]]` format and ISO 8601 (including a trailing `Z` or a UTC offset) are all accepted. Times without a timezone are treated as UTC.
- **New service function:** `get_booking_ics()` in [`services/booking.py`](booking_system_backend/services/booking.py). It returns an `ErrorResponse` on failure, following the existing Union-return convention.
- **Error responses:**

  | Condition | HTTP status | `error_code` |
  |---|---|---|
  | Booking does not exist | 404 | `BOOKING_NOT_FOUND` |
  | Booking's flight does not exist | 404 | `FLIGHT_NOT_FOUND` |
  | Flight time cannot be parsed | 400 | `INVALID_TIME_FORMAT` |

### Frontend
- [`BookingCard.tsx`](booking_system_frontend/src/components/bookings/BookingCard.tsx) now shows an **Add to Calendar** button next to **Cancel Booking**. It appears only for bookings with status `booked`.
- The download is triggered by a temporary `<a download>` link, not Axios, so the browser handles it as a normal file download.
- [`api.ts`](booking_system_frontend/src/services/api.ts) now exports `API_BASE_URL` so components can build direct download links.

### Developer experience
- [`start_locally.sh`](scripts/local/start_locally.sh) now supports Windows (Git Bash/MSYS). It falls back to `python` when `python3` is missing, and uses `.venv/Scripts/` instead of `.venv/bin/` on Windows.

## Tests
- New unit tests in `tests/test_services.py` and REST tests in `tests/test_rest.py` cover the `.ics` output, error paths and time parsing.

## Known gaps and notes
- **Out of scope per the issue:** Google Calendar deep-links, and multi-leg itineraries with several `VEVENT`s.
- **No dedicated MCP tool.** Issue #44 asked for a matching MCP tool, but the commit adds only the REST endpoint. If MCP exposure is automatic through `FastApiMCP`, agents can already reach it. This needs confirming.
- **Dependency lockfile change.** `booking_system_frontend/package-lock.json` shrank by about 300 lines in the same commit. This is probably unrelated to the feature, so review it before release.
- The frontend builds the download URL from `VITE_API_URL`, which defaults to `/api`. The deployment's reverse proxy must route that prefix to the backend.
