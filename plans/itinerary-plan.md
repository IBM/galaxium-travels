# Plan: multi-leg itineraries

Requirements: `docs/itinerary-stories.md`.

## Scope

- Search for routes of 1 to 3 legs, book every leg through the Java hold service all or nothing, confirm the holds into bookings, and list a user's trips.
- A `/trips` page and a **Trips** link in the header next to **Flights**.
- Out of scope: seat classes other than economy, changing or cancelling a booked trip, and any change to the Java hold service.

## Rules

- The first leg departs on the requested date (UTC). Origin and destination match case-insensitively.
- A connection is valid when the next leg departs from the previous leg's destination 2 to 72 hours after it arrives, inclusive. This check is `is_valid_connection(arriving, departing)` in `booking_system_backend/services/itinerary_search.py`, written before implementation starts. Call it, and `parse_time(value)` from the same file; don't rewrite them.
- A route never revisits a location, and every leg needs at least 1 economy seat.
- Sort by total travel time, then total price. Return at most 10 routes.
- Hold IDs are never returned to clients.

## Sub-task 1: Backend

1. **Route search.** In `itinerary_search.py`, add a frozen `Route` dataclass (`legs`, plus `total_minutes`, `total_price`, and `layover_minutes` properties) and `find_routes(flights, origin, destination, travel_date)` that applies the rules above. Pure functions, no database.
2. **Seed data.** In `seed.py`, add `seed_connecting_flights(db)`, which inserts any missing connecting flights and runs on both paths of `seed()`:
   - Earth→Moon, Moon→Mars, and Earth→Mars on 2099-02-01; Mars→Jupiter and Jupiter→Europa on 2099-02-02 (one three-leg Earth→Europa route).
   - Earth→Moon and Moon→Mars on 2099-03-01 (one two-leg Earth→Mars route).
3. **Database.** Add `itineraries` (`itinerary_id`, `user_id`, `status` held/confirmed/failed, `created_at`, `total_price`) and `itinerary_legs` (`leg_id`, `itinerary_id`, `position`, `flight_id`, `hold_id`, `booking_id`) tables, and a nullable `bookings.itinerary_id`. `create_all()` never alters existing tables, so add `add_missing_columns(engine)` to `db.py`, which runs `ALTER TABLE bookings ADD COLUMN itinerary_id INTEGER` when the column is missing, and call it from `init_db()`. Don't rebuild the database.
4. **Hold client.** Add `services/hold_client.py` with an `HttpHoldClient` that calls the Java service directly with `httpx`, using the request bodies in `booking_system_inventory_hold_service/README.md`:
   - `POST /api/v1/quotes` with `flightId`, `seatClass` (`economy`), `quantity` (`1`), `travelerId`, and `travelerName`
   - `POST /api/v1/quotes/{quoteId}/holds`
   - `POST /api/v1/holds/{holdId}/confirm`, which returns the booking ID. The hold service creates the booking through `/internal/bookings/from-hold`, so don't book the flight again.
   - `POST /api/v1/holds/{holdId}/release`

   Don't reuse the proxy routes in `server.py`, because they return HTTP 200 on errors. Raise `HoldError` on any failure, including an HTTP 200 response without the expected ID. Expose the client as a FastAPI dependency so tests can replace it with a fake.
5. **Service.** Add `services/itinerary.py`, following the result-or-`ErrorResponse` pattern in `services/booking.py`:
   - `search` rejects the same origin and destination (`SAME_ORIGIN_DESTINATION`).
   - `create_itinerary` validates the user and name, 1 to 3 legs, known flights, valid connections, and economy seats; then holds every leg. If any hold fails, release the earlier holds, save nothing, and return `HOLD_FAILED`.
   - `confirm_itinerary` confirms each hold in order and stores each leg's `booking_id`. If any confirm fails, cancel the legs already confirmed so their seats return, release the remaining holds, mark the itinerary failed, and return `CONFIRM_FAILED`. On success, link each booking to the itinerary.
   - `list_itineraries` returns a user's itineraries, newest first.
6. **Endpoints.** In `server.py`, add `GET /itineraries/search`, `POST /itineraries`, `POST /itineraries/{itinerary_id}/confirm`, and `GET /users/{user_id}/itineraries`. Map error codes to HTTP status: 404 for not found, 409 for name mismatch, no seats, and invalid status, 422 for invalid input, and 502 for `HOLD_FAILED` and `CONFIRM_FAILED`.
7. **Tests.** Unit tests for the routing rules and boundaries, service tests with a fake hold client, including a failed hold and a confirm that fails partway (`CONFIRM_FAILED`), and REST tests for every endpoint. Existing tests must keep passing.

## Sub-task 2: Frontend

1. **API.** Add types and API functions for the four endpoints.
2. **Timeline.** Add a `TripTimeline` component that shows each leg and the layover between legs.
3. **Trips page.** Add a `/trips` page with the search form, results with a **Book trip** button, and a **My trips** section. **Book trip** creates the itinerary and confirms it in one click; there is no separate confirm step.
4. **Header.** Add the **Trips** link next to **Flights**, on desktop and mobile.

## Done when

Searching Earth to Europa on 2099-02-01 returns one three-leg route, and a signed-in user can book it from `/trips` and see it under **My trips** with status confirmed.
