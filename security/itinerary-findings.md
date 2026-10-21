# Trust boundary audit: itinerary API

Files: `booking_system_backend/server.py`, `booking_system_backend/schemas.py`, `booking_system_backend/services/itinerary.py`. Line numbers refer to the code before the fix.

## Phase 1: Trust boundary

| Endpoint | Client-controlled fields | What the server does with them |
|---|---|---|
| `POST /itineraries` | `user_id`, `name`, `flight_ids` | Validates the user and flights, then holds a seat on every flight |
| `POST /itineraries/{itinerary_id}/confirm` | `itinerary_id` | Confirms the holds of any held itinerary with that ID |
| `POST /internal/bookings/from-hold` | Any JSON object | Reads traveler and flight fields from a raw dict and creates a booking |

## Phase 2: Controls

| Control | Result |
|---|---|
| V5.1.2 Mass parameter assignment | FAIL |
| V5.1.3 Allow-list input validation | FAIL |
| V11.1.4 Limits on excessive business requests | FAIL |
| V11.1.5 Business logic limits | PASS |

## Phase 3: Findings

**Finding 1**
- Rule: ASVS V5.1.3, V11.1.4
- Severity: High
- File and line: `booking_system_backend/schemas.py`, line 110
- Issue: `flight_ids` has no length cap in the request schema, so one request can try to hold seats on hundreds of flights.
- Fix: Require 1 to 3 flight IDs in `ItineraryCreate` so FastAPI rejects other lengths with HTTP 422.

**Finding 2**
- Rule: ASVS V11.1.4
- Severity: Medium
- File and line: `booking_system_backend/services/itinerary.py`, line 157
- Issue: A user can create any number of held itineraries and keep seats locked without ever confirming.
- Fix: Limit each user to 3 held itineraries created within the hold duration and return HTTP 429.

**Finding 3**
- Rule: ASVS V5.1.3
- Severity: Medium
- File and line: `booking_system_backend/server.py`, line 282
- Issue: The confirm endpoint takes only `itinerary_id` and never checks that the itinerary belongs to the caller.
- Fix: Verify ownership once the app has authentication.

**Finding 4**
- Rule: ASVS V5.1.2, V5.1.3
- Severity: High
- File and line: `booking_system_backend/server.py`, line 308
- Issue: `/internal/bookings/from-hold` accepts a raw dict with no schema or field validation, so any caller can book as any user.
- Fix: Validate the body with a Pydantic model and restrict the endpoint to the hold service.
