# Seat Classes Plan — Galaxium Travels

## Overview

Add three seat classes — **Economy**, **Business**, and **Galaxium** — to the Galaxium Travels booking system.
Each class will have its own seat count and price per flight. Users select their class on the flight
listing page (before the booking modal). The chosen class is stored on the booking record, displayed
in "My Bookings", and its seat count is restored on cancellation.

The change touches: the database model, Pydantic schemas, booking service, seed data, MCP/REST
endpoints, frontend types, and the flight listing + booking UI.

---

## Sub-Tasks

---

### Sub-Task 1 — Extend the Backend Data Model

**Intent**  
Introduce a `seat_class` concept at the database level. The `Flight` model's single
`price`/`seats_available` pair must be replaced with per-class fields. The `Booking` model must
record which class was booked.

**Expected Outcomes**
- `Flight` has six new columns: `economy_price`, `economy_seats`, `business_price`,
  `business_seats`, `galaxium_price`, `galaxium_seats`.
- The old `price` and `seats_available` columns are removed from `Flight`.
- `Booking` gains a `seat_class` column (string: `"economy"` | `"business"` | `"galaxium"`).
- The database re-creates cleanly when the server starts (SQLite drops and recreates on seed).

**Todo List**
1. In [`models.py`](galaxium-travels/booking_system_backend/models.py), replace `price` and
   `seats_available` on `Flight` with `economy_price`, `economy_seats`, `business_price`,
   `business_seats`, `galaxium_price`, `galaxium_seats` (all `Integer`, `nullable=False`).
2. In [`models.py`](galaxium-travels/booking_system_backend/models.py), add `seat_class` column
   (`String`, `nullable=False`) to the `Booking` model.

**Relevant Context**
- [`models.py`](galaxium-travels/booking_system_backend/models.py) lines 12–28 — current `Flight`
  and `Booking` definitions.
- SQLite is file-based; the seed script drops and recreates all tables on every server start, so no
  migration script is required.

**Status** — `[x] done`

---

### Sub-Task 2 — Update Pydantic Schemas

**Intent**  
Align all request/response contracts with the new data model so that the API correctly
serialises/deserialises per-class pricing and the chosen seat class on a booking.

**Expected Outcomes**
- `FlightOut` exposes `economy_price`, `economy_seats`, `business_price`, `business_seats`,
  `galaxium_price`, `galaxium_seats` instead of `price` and `seats_available`.
- `BookingRequest` includes a `seat_class` field (`Literal["economy", "business", "galaxium"]`).
- `BookingOut` includes a `seat_class` field.

**Todo List**
1. In [`schemas.py`](galaxium-travels/booking_system_backend/schemas.py), update `FlightOut` —
   remove `price: int` and `seats_available: int`; add the six per-class integer fields.
2. In [`schemas.py`](galaxium-travels/booking_system_backend/schemas.py), add
   `seat_class: Literal["economy", "business", "galaxium"]` to `BookingRequest`.
3. In [`schemas.py`](galaxium-travels/booking_system_backend/schemas.py), add the same
   `seat_class` field to `BookingOut`.
4. Import `Literal` from `typing` at the top of `schemas.py`.

**Relevant Context**
- [`schemas.py`](galaxium-travels/booking_system_backend/schemas.py) — current schema definitions.
- `BookingRequest` is used by both the REST `POST /book` endpoint and the MCP `book_flight` tool.

**Status** — `[x] done`

---

### Sub-Task 3 — Update the Booking Service

**Intent**  
Update the business logic so that booking validates and decrements the correct class's seat count,
and cancellation restores the correct class's seat count.

**Expected Outcomes**
- `book_flight()` accepts a `seat_class` parameter.
- It checks availability on the matching class field (e.g. `flight.economy_seats`).
- It decrements only that class's seat count on success.
- `cancel_booking()` reads `booking.seat_class` and restores the right field.
- Error codes remain consistent (`NO_SEATS_AVAILABLE`, etc.).

**Todo List**
1. In [`services/booking.py`](galaxium-travels/booking_system_backend/services/booking.py),
   add `seat_class: str` parameter to `book_flight()`.
2. Replace the `flight.seats_available < 1` check with a lookup against the appropriate class field
   using a helper (e.g. a small dict or `getattr`) so the logic stays concise.
3. Replace `flight.seats_available -= 1` with the matching per-class decrement.
4. Pass `seat_class=seat_class` when constructing the new `Booking`.
5. In `cancel_booking()`, look up the cancelled booking's `seat_class` and increment the
   corresponding flight field.

**Relevant Context**
- [`services/booking.py`](galaxium-travels/booking_system_backend/services/booking.py) lines 7–88.
- Use `getattr` / `setattr` on the `Flight` instance with a computed attribute name
  (e.g. `f"{seat_class}_seats"`) to avoid repeating the same logic three times.

**Status** — `[x] done`

---

### Sub-Task 4 — Update REST Endpoints and MCP Tools

**Intent**  
Thread the new `seat_class` parameter through the API surface so both REST clients (the frontend)
and MCP clients (AI agents) can pass a seat class when booking.

**Expected Outcomes**
- `POST /book` reads `seat_class` from `BookingRequest` and forwards it to the service.
- MCP `book_flight` tool accepts a `seat_class` parameter and forwards it.
- `GET /flights` returns per-class pricing fields (automatic once `FlightOut` is updated).
- Swagger UI reflects the new fields.

**Todo List**
1. In [`server.py`](galaxium-travels/booking_system_backend/server.py), update the MCP
   `book_flight` tool signature to add `seat_class: str`.
2. Pass `seat_class` through to `booking.book_flight(db, user_id, name, flight_id, seat_class)`.
3. Update the REST `book_flight_endpoint` to pass `request.seat_class` to the service call.
4. Update the docstrings on both to mention `seat_class`.

**Relevant Context**
- [`server.py`](galaxium-travels/booking_system_backend/server.py) lines 31–43 (MCP tool),
  lines 145–151 (REST endpoint).

**Status** — `[x] done`

---

### Sub-Task 5 — Update Seed Data

**Intent**  
Replace the old `price`/`seats_available` values in the seed script with realistic per-class data
for each of the 10 existing flights, and ensure seeded bookings include a `seat_class`.

**Expected Outcomes**
- All 10 flights are seeded with `economy_price`, `economy_seats`, `business_price`,
  `business_seats`, `galaxium_price`, `galaxium_seats`.
- The 20 demo bookings each include a randomly chosen `seat_class`.
- Server starts cleanly and the database reflects the new schema.

**Todo List**
1. In [`seed.py`](galaxium-travels/booking_system_backend/seed.py), update every `Flight(...)`
   constructor call to use the six new fields instead of `price` and `seats_available`.
   Use a pattern where Economy is the cheapest/most seats and Galaxium is the most
   expensive/fewest seats (e.g. Economy: base price × 1, 50 seats; Business: × 2, 20 seats;
   Galaxium: × 5, 5 seats — adjust numbers to fit the existing flight prices sensibly).
2. Add `seat_classes = ["economy", "business", "galaxium"]` to the booking seed loop and assign
   `seat_class=random.choice(seat_classes)` to each demo `Booking`.

**Relevant Context**
- [`seed.py`](galaxium-travels/booking_system_backend/seed.py) lines 30–57.
- The 10 existing flights and their original prices are a useful baseline for deriving per-class
  prices.

**Status** — `[x] done`

---

### Sub-Task 6 — Update Frontend Types

**Intent**  
Keep the TypeScript types in sync with the new backend contracts so the rest of the frontend
compiles correctly.

**Expected Outcomes**
- `Flight` interface has the six per-class fields; `price` and `seats_available` are removed.
- `Booking` and `BookingRequest` interfaces include `seat_class`.
- `BookingWithFlight` continues to extend `Booking` (inherits `seat_class` automatically).
- No TypeScript compile errors from this change alone.

**Todo List**
1. In [`src/types/index.ts`](galaxium-travels/booking_system_frontend/src/types/index.ts), replace
   `price: number` and `seats_available: number` on `Flight` with the six new fields.
2. Add `seat_class: 'economy' | 'business' | 'galaxium'` to both `Booking` and `BookingRequest`.

**Relevant Context**
- [`src/types/index.ts`](galaxium-travels/booking_system_frontend/src/types/index.ts) — all type
  definitions for the frontend.

**Status** — `[x] done`

---

### Sub-Task 7 — Update the Flight Card UI

**Intent**  
Replace the single "Book Now" button on each flight card with three class-selector buttons — one
per class — each showing the class name, its price, and remaining seats. Clicking a class button
passes both the `flight` and the chosen `seat_class` upstream.

**Expected Outcomes**
- Each `FlightCard` shows Economy / Business / Galaxium sections with price and seats.
- A class with 0 seats shows as "Sold Out" and its button is disabled.
- A class with ≤ 2 seats shows a low-seat warning (matching the existing orange colour pattern).
- The `onBook` callback receives both the flight and the selected `seat_class`.
- The `Flights` page passes the correct `seat_class` into the booking modal.

**Todo List**
1. In [`FlightCard.tsx`](galaxium-travels/booking_system_frontend/src/components/flights/FlightCard.tsx),
   update `FlightCardProps.onBook` signature to `(flight: Flight, seatClass: SeatClass) => void`.
2. Replace the single price/seat section and "Book Now" button with a three-row class selector.
   Each row: class label, price, seat count (or "Sold Out"), and a "Book" button.
3. Import a `SeatClass` type (`'economy' | 'business' | 'galaxium'`) — can be defined inline
   or imported from `types/index.ts`.
4. In [`Flights.tsx`](galaxium-travels/booking_system_frontend/src/pages/Flights.tsx), update the
   `onBook` handler to accept and store `seatClass`, pass it into `BookingModal`.

**Relevant Context**
- [`FlightCard.tsx`](galaxium-travels/booking_system_frontend/src/components/flights/FlightCard.tsx)
  — current card layout; reuse the existing colour classes (`text-alien-green`, `text-solar-orange`,
  `text-cosmic-purple`, `bg-cosmic-gradient`).
- [`Flights.tsx`](galaxium-travels/booking_system_frontend/src/pages/Flights.tsx) — manages
  `selectedFlight` state and opens `BookingModal`.

**Status** — `[x] done`

---

### Sub-Task 8 — Update the Booking Modal and Booking Card

**Intent**  
Pass the selected `seat_class` through the booking confirmation flow and display the class on
booked/past bookings in "My Bookings".

**Expected Outcomes**
- `BookingModal` receives a `seatClass` prop and includes it in the `bookFlight` API call.
- The modal shows the selected class and its price in the confirmation summary.
- `BookingCard` displays the `seat_class` badge next to the booking status.
- The price shown on `BookingCard` uses the stored `seat_class` to look up the correct per-class
  price from the linked `flight` object.

**Todo List**
1. In [`BookingModal.tsx`](galaxium-travels/booking_system_frontend/src/components/bookings/BookingModal.tsx),
   add `seatClass: SeatClass` to `BookingModalProps`.
2. Include `seat_class: seatClass` in the `bookFlight(...)` call.
3. Display the chosen class name and its price in the modal's price section (replace the static
   `flight.price` reference).
4. In [`BookingCard.tsx`](galaxium-travels/booking_system_frontend/src/components/bookings/BookingCard.tsx),
   add a small class badge (e.g. "Economy", "Business", "Galaxium") next to the booking status.
5. Update the price display in `BookingCard` to derive the price from
   `flight[`${booking.seat_class}_price`]` instead of the now-removed `flight.price`.

**Relevant Context**
- [`BookingModal.tsx`](galaxium-travels/booking_system_frontend/src/components/bookings/BookingModal.tsx)
  lines 10–36 (props, booking call).
- [`BookingCard.tsx`](galaxium-travels/booking_system_frontend/src/components/bookings/BookingCard.tsx)
  lines 94–99 (price display).
- The `SeatClass` type can be imported from `types/index.ts` once it is defined there (Sub-Task 6).

**Status** — `[x] done`

---

## Notes for Implementation

- Sub-Tasks 1 → 2 → 3 → 4 → 5 must be done in order (each depends on the previous).
- Sub-Tasks 6 → 7 → 8 must be done in order (each depends on the previous).
- Backend (1–5) and frontend (6–8) tracks are otherwise independent and can be implemented
  sequentially or in parallel.
- The `SeatClass` type (`'economy' | 'business' | 'galaxium'`) should be exported from
  `src/types/index.ts` (Sub-Task 6) and reused in Sub-Tasks 7 and 8.
- No database migration script is needed — SQLite is dropped and re-seeded every server start.
