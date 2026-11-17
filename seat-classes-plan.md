# Seat Classes Plan

## Overview

Add three seat classes — **Economy**, **Business**, and **Galaxium** — to Galaxium Travels.

Each class has its own seat count per flight and a fixed price multiplier applied to the flight's base price:

| Class    | Price Multiplier |
|----------|-----------------|
| Economy  | 1×              |
| Business | 2×              |
| Galaxium | 4×              |

The user selects a class inside the BookingModal before confirming. The chosen class is stored on the booking record and displayed as a badge on BookingCard in MyBookings.

**Scope:** Backend model + schema + service changes, frontend type + API + UI changes, and seed data updates.  
**Non-goals:** Individual seat-number assignment, dynamic pricing, upgrades, multi-passenger bookings.

---

## Sub-Tasks

---

### Sub-Task 1 — Update the Backend Flight model and seed data

**Status:** [ ] pending

**Intent**  
Replace the single `seats_available` field on the `Flight` database model with three class-specific fields (`economy_seats`, `business_seats`, `galaxium_seats`). Update seed data to match.

**Expected Outcomes**
- `Flight` ORM model has `economy_seats`, `business_seats`, `galaxium_seats` integer columns; `seats_available` is removed.
- Seed data sets Economy = 5, Business = 3, Galaxium = 1 for every seeded flight.
- The SQLite database can be re-created from scratch with the new schema by dropping and re-seeding.

**Todo List**
1. In `booking_system_backend/models.py`, remove `seats_available` and add `economy_seats`, `business_seats`, `galaxium_seats` (Integer, required) to the `Flight` model.
2. In `booking_system_backend/seed.py`, replace `seats_available=...` with `economy_seats=5, business_seats=3, galaxium_seats=1` on every `Flight(...)` constructor call.
3. Delete `booking_system_backend/booking.db` so SQLAlchemy recreates the schema on next startup.

**Relevant Context**
- `booking_system_backend/models.py` — `Flight` class, line ~12–20
- `booking_system_backend/seed.py` — 10 `Flight(...)` constructors

---

### Sub-Task 2 — Update Backend Booking model and add `seat_class` field

**Status:** [ ] pending

**Intent**  
Record which seat class was booked by adding a `seat_class` string column to the `Booking` model.

**Expected Outcomes**
- `Booking` ORM model has a `seat_class` column (String, values: `economy`, `business`, `galaxium`).
- Seed data populates `seat_class` on existing seeded bookings (use `economy` as default for all seed bookings).

**Todo List**
1. In `booking_system_backend/models.py`, add `seat_class = Column(String, nullable=False)` to the `Booking` model.
2. In `booking_system_backend/seed.py`, add `seat_class="economy"` (or varied values for realism) to every `Booking(...)` constructor call.

**Relevant Context**
- `booking_system_backend/models.py` — `Booking` class, line ~22–28
- `booking_system_backend/seed.py` — 20 `Booking(...)` constructors

---

### Sub-Task 3 — Update Backend Pydantic schemas

**Status:** [ ] pending

**Intent**  
Keep the API request/response contracts in sync with the new model fields.

**Expected Outcomes**
- `FlightSchema` (response) exposes `economy_seats`, `business_seats`, `galaxium_seats`; `seats_available` is removed.
- `BookingRequest` schema accepts a required `seat_class` field (validated as a literal `economy | business | galaxium`).
- `BookingSchema` (response) includes `seat_class`.

**Todo List**
1. In `booking_system_backend/schemas.py`, update `FlightSchema`: remove `seats_available`, add `economy_seats`, `business_seats`, `galaxium_seats` (int fields).
2. In `booking_system_backend/schemas.py`, update `BookingRequest`: add `seat_class: Literal["economy", "business", "galaxium"]` (import `Literal` from `typing`).
3. In `booking_system_backend/schemas.py`, update `BookingSchema` (response): add `seat_class: str`.

**Relevant Context**
- `booking_system_backend/schemas.py` — all schema classes (~54 lines total)

---

### Sub-Task 4 — Update Backend booking service and route

**Status:** [ ] pending

**Intent**  
Make the booking logic decrement the correct seat-class counter and reject bookings when that class is sold out.

**Expected Outcomes**
- `book_flight()` service accepts `seat_class` and decrements the matching field (`economy_seats`, `business_seats`, or `galaxium_seats`).
- If the chosen class has 0 seats, the service raises the existing `NO_SEATS_AVAILABLE` error (or equivalent).
- `cancel_booking()` increments the correct seat-class counter when a booking is cancelled.
- The `/book` route passes `seat_class` from the request body to the service.
- The `/flights` route continues to work unchanged (it now returns three seat fields instead of one).

**Todo List**
1. In `booking_system_backend/services/booking.py`, update `book_flight()` signature to accept `seat_class: str`. Use a mapping (`{"economy": "economy_seats", ...}`) to select the correct column, check for availability, decrement it, and store `seat_class` on the new `Booking` record.
2. In `booking_system_backend/services/booking.py`, update `cancel_booking()` to read `booking.seat_class` and increment the matching flight column.
3. In `booking_system_backend/server.py`, update the `/book` route to pass `booking_request.seat_class` to `book_flight()`.

**Relevant Context**
- `booking_system_backend/services/booking.py` — `book_flight()` and `cancel_booking()` functions (~89 lines)
- `booking_system_backend/server.py` — `/book` POST route

---

### Sub-Task 5 — Update Frontend TypeScript types and API service

**Status:** [ ] pending

**Intent**  
Keep the frontend type system and API client in sync with the updated backend contracts.

**Expected Outcomes**
- `Flight` interface has `economy_seats`, `business_seats`, `galaxium_seats`; `seats_available` is removed.
- A `SeatClass` type alias is defined (`"economy" | "business" | "galaxium"`).
- `BookingRequest` includes `seat_class: SeatClass`.
- `Booking` interface includes `seat_class: SeatClass`.
- `bookFlight()` in `api.ts` sends `seat_class` in the request payload.

**Todo List**
1. In `booking_system_frontend/src/types/index.ts`, update `Flight`: remove `seats_available`, add `economy_seats`, `business_seats`, `galaxium_seats` (number).
2. In `booking_system_frontend/src/types/index.ts`, add `export type SeatClass = "economy" | "business" | "galaxium"`.
3. In `booking_system_frontend/src/types/index.ts`, add `seat_class: SeatClass` to `BookingRequest` and to `Booking`.
4. In `booking_system_frontend/src/services/api.ts`, verify `bookFlight()` passes the full `BookingRequest` body (no changes needed if it already serialises the whole object; confirm this).

**Relevant Context**
- `booking_system_frontend/src/types/index.ts` — all interfaces
- `booking_system_frontend/src/services/api.ts` — `bookFlight()` method

---

### Sub-Task 6 — Update FlightCard to display per-class pricing and availability

**Status:** [ ] pending

**Intent**  
Give users a clear view of what each class costs and how many seats remain, before they open the booking flow.

**Expected Outcomes**
- `FlightCard` no longer shows a single price and single seat count.
- Instead it shows three rows (Economy / Business / Galaxium), each with its computed price and seat count.
- "Sold Out" indicator applies per class (a class is sold out if its seat count is 0).
- The overall flight is only fully sold out if all three classes have 0 seats.
- The "Book Now" button remains and opens the booking flow as before.

**Price computation (frontend, no backend call needed):**
  - Economy price = `flight.price × 1`
  - Business price = `flight.price × 2`
  - Galaxium price = `flight.price × 4`

**Todo List**
1. In `booking_system_frontend/src/components/flights/FlightCard.tsx`, update derived values: replace `isSoldOut` / `isLowSeats` logic (which used `seats_available`) with per-class sold-out flags using the three new seat fields.
2. Add a seat-class summary section to the card UI showing Economy / Business / Galaxium with computed price and seat count for each.
3. Remove the old single-price and single-seat-count display that referenced `seats_available`.
4. Disable "Book Now" only when all three classes are sold out.

**Relevant Context**
- `booking_system_frontend/src/components/flights/FlightCard.tsx` (~104 lines)
- `booking_system_frontend/src/utils/formatters.ts` — `formatCurrency()` for price display

---

### Sub-Task 7 — Update BookingModal to include seat-class selection

**Status:** [ ] pending

**Intent**  
Let the user pick their seat class inside the BookingModal before confirming the booking.

**Expected Outcomes**
- BookingModal renders a seat-class selector (three options: Economy, Business, Galaxium).
- Each option shows the class name, computed price, and remaining seats.
- Options with 0 seats are shown as disabled / greyed out.
- Selecting a class updates the displayed total price.
- On confirm, the chosen `seat_class` is included in the `BookingRequest` sent to the API.
- The parent component (`Flights.tsx`) passes the `Flight` object to `BookingModal` so it can compute prices and check availability.

**Todo List**
1. In `booking_system_frontend/src/components/bookings/BookingModal.tsx`, add `selectedClass` state (default to first available class).
2. Add a seat-class picker UI section above the confirm button with three selectable cards/buttons for Economy, Business, Galaxium.
3. Update the price shown in the modal summary to reflect the selected class multiplier.
4. Pass `seat_class: selectedClass` in the `bookFlight()` call.
5. In `booking_system_frontend/src/pages/Flights.tsx`, verify the `flight` prop is already forwarded to `BookingModal` (it is — confirm and adjust if needed).

**Relevant Context**
- `booking_system_frontend/src/components/bookings/BookingModal.tsx` (~163 lines)
- `booking_system_frontend/src/pages/Flights.tsx` — where `BookingModal` is rendered

---

### Sub-Task 8 — Update BookingCard to display the booked seat class

**Status:** [ ] pending

**Intent**  
Show the user which class they booked in their booking history.

**Expected Outcomes**
- `BookingCard` shows a badge or label indicating the seat class (Economy / Business / Galaxium) for each booking.
- The badge uses a distinct colour per class consistent with the cosmic theme (e.g. Economy = star-white, Business = cosmic-purple, Galaxium = solar-orange or alien-green).

**Todo List**
1. In `booking_system_frontend/src/components/bookings/BookingCard.tsx`, add a seat-class badge next to the existing status badge.
2. Define a colour/style mapping for the three classes using existing Tailwind theme classes.
3. Ensure the `Booking` type (which now includes `seat_class`) is used to drive the badge.

**Relevant Context**
- `booking_system_frontend/src/components/bookings/BookingCard.tsx` (~130 lines)
- Existing status badge pattern in the same file for colour-mapping reference

---

### Sub-Task 9 — Update backend tests

**Status:** [ ] pending

**Intent**  
Keep the existing test suite green by updating tests that reference the old `seats_available` field or the old `book_flight` signature.

**Expected Outcomes**
- All existing tests pass with the new schema.
- Tests that create `Flight` objects use the three new seat fields.
- Tests that call `book_flight` pass a `seat_class` argument.
- At least one test covers booking each of the three classes and checks the correct counter decrements.

**Todo List**
1. In `booking_system_backend/tests/conftest.py`, update any `Flight(...)` fixture to use the three new seat fields.
2. In `booking_system_backend/tests/test_services.py` and `test_rest.py`, update calls to `book_flight` and any assertions on `seats_available` to use the new fields and `seat_class` argument.
3. Add test cases for booking Business and Galaxium classes and for sold-out behaviour per class.

**Relevant Context**
- `booking_system_backend/tests/conftest.py`
- `booking_system_backend/tests/test_services.py`
- `booking_system_backend/tests/test_rest.py`
