# Plan: Seat Class Selection

## Overview

Add a `seat_class` field to the booking flow so passengers can choose **Economy**, **Business**, or **Galaxium** class when booking a flight. The selected class is stored on the booking record and displayed in the booking confirmation card.

**In scope:** database schema, backend model + schemas + service + API, frontend type, booking modal UI, booking card display.  
**Out of scope:** admin dashboard, per-class pricing, per-class seat inventory.

**Backward compatibility:** `seat_class` defaults to `"economy"` at the database column level so existing rows — and the seeded demo bookings in `seed.py` — remain valid without data migration.

---

## Sub-Tasks

---

### Sub-Task 1 — Database & Backend

**Intent**  
Add `seat_class` to the `Booking` ORM model with a column-level default of `"economy"`, propagate it through `BookingRequest` and `BookingOut` schemas, and thread it through `services/booking.py` and the REST + MCP layers in `server.py`.

**Expected Outcomes**
- `POST /book` accepts an optional `seat_class` field (`"economy"` | `"business"` | `"galaxium"`), defaulting to `"economy"` if omitted.
- `GET /bookings/{user_id}` returns `seat_class` on every booking object.
- Existing seeded bookings (created without `seat_class`) are readable without error.
- All existing backend tests continue to pass.

**Todo List**
- [ ] In `models.py` add `seat_class = Column(String, nullable=False, server_default="economy")` to the `Booking` model.
- [ ] In `schemas.py` add `seat_class: str = "economy"` to `BookingRequest` and `seat_class: str` to `BookingOut`.
- [ ] In `services/booking.py` pass `seat_class` from the request into the `Booking(...)` constructor.
- [ ] In `server.py` thread `seat_class` from `BookingRequest` through to `booking.book_flight(...)` in both the REST route and the MCP `book_flight` tool.
- [ ] In `seed.py` add an explicit `seat_class` to the seeded `Booking` inserts so demo data is representative.
- [ ] Run `pytest` from `booking_system_backend/` and confirm all tests pass.

**Relevant Context**
- `booking_system_backend/models.py` — `Booking` model; `create_all` runs on startup, no migration tooling exists.
- `booking_system_backend/schemas.py` — `BookingRequest` (lines 18–21), `BookingOut` (lines 24–29).
- `booking_system_backend/services/booking.py` — `book_flight` function; `Booking(...)` constructor call at line 48.
- `booking_system_backend/server.py` — REST `POST /book` (line 145–151), MCP `book_flight` tool (lines 31–43).
- `booking_system_backend/seed.py` — demo booking inserts.
- Schema note: `create_all` does **not** alter existing columns — the `server_default` only applies to new tables. For the in-memory test DB this is fine. For a live SQLite file, the column must be added manually or the file deleted; document this in the plan.

**Status:** `[ ] pending`

---

### Sub-Task 2 — Frontend Types & API Layer

**Intent**  
Add `seat_class` to the TypeScript `Booking` and `BookingRequest` types and to the `bookFlight` API call so the frontend can send and receive the field type-safely.

**Expected Outcomes**
- `Booking` type has `seat_class: 'economy' | 'business' | 'galaxium'`.
- `BookingRequest` type has `seat_class: 'economy' | 'business' | 'galaxium'`.
- `bookFlight(data: BookingRequest)` includes `seat_class` in the POST body.
- `npm run build` passes with no type errors.

**Todo List**
- [ ] In `src/types/index.ts` add `seat_class: 'economy' | 'business' | 'galaxium'` to the `Booking` interface.
- [ ] In `src/types/index.ts` add `seat_class: 'economy' | 'business' | 'galaxium'` to the `BookingRequest` interface.
- [ ] Confirm `src/services/api.ts` `bookFlight` passes the full `BookingRequest` object as the POST body — no change needed if it already spreads the argument, but verify.
- [ ] Run `npm run build` from `booking_system_frontend/` and confirm no type errors.

**Relevant Context**
- `booking_system_frontend/src/types/index.ts` — `Booking` and `BookingRequest` interfaces.
- `booking_system_frontend/src/services/api.ts` — `bookFlight` function; currently posts `{ user_id, name, flight_id }`.
- Pattern note: `status` uses a string literal union (`'booked' | 'cancelled' | 'completed'`) — follow the same pattern for `seat_class`.
- `verbatimModuleSyntax` is on; use `import type` for any type-only imports added.

**Status:** `[ ] pending`

---

### Sub-Task 3 — Booking UI (Modal & Card)

**Intent**  
Add a seat class selector to `BookingModal` so the user can choose a class before confirming, and display the selected class on `BookingCard` in the confirmation list.

**Expected Outcomes**
- `BookingModal` renders three selectable options: Economy, Business, Galaxium class.
- Economy is pre-selected by default.
- The selected class is included in the `bookFlight(...)` call.
- `BookingCard` shows the seat class alongside existing booking details.
- `npm run build` and `npm run lint` pass cleanly.

**Todo List**
- [ ] In `BookingModal.tsx` add a `seatClass` state variable initialised to `'economy'`.
- [ ] Render a styled three-option selector (radio group or button group) using the following per-class colours from the existing Tailwind tokens — do not introduce new colour tokens:
  - **Economy** — `alien-green` (`#10B981`)
  - **Business** — `solar-orange` (`#F59E0B`, the closest defined token to gold)
  - **Galaxium** — `cosmic-gradient` (`bg-cosmic-gradient`, a `backgroundImage` utility defined in `tailwind.config.js`)
- [ ] Pass `seat_class: seatClass` into the `bookFlight({ user_id, name, flight_id, seat_class })` call.
- [ ] Reset `seatClass` to `'economy'` when the modal closes (alongside any existing reset logic).
- [ ] In `BookingCard.tsx` add a display row for `booking.seat_class`, formatted as "Economy", "Business", or "Galaxium Class".
- [ ] Run `npm run build` and `npm run lint` from `booking_system_frontend/` and confirm both pass.

**Relevant Context**
- `booking_system_frontend/src/components/bookings/BookingModal.tsx` — confirm button calls `bookFlight(...)`, modal has `onClose` handler to reset state.
- `booking_system_frontend/src/components/bookings/BookingCard.tsx` — renders booking fields in a card layout; `booking.status` display is the closest pattern to follow for `seat_class`.
- `booking_system_frontend/tailwind.config.js` — custom colour tokens; do not use raw hex values.
- TypeScript strict mode + `noUnusedLocals` — every declared variable must be used.

**Status:** `[ ] pending`
