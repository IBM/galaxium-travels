Let operations delay or cancel a flight, and show it everywhere: the ship shifts on the solar map, the status reads "Delayed", and travellers with a booking or a hold are told.

This is an epic. Split it into smaller issues before building.

### Gap
A flight's times never change after seeding. The app has no notion of a delay or a cancelled flight, so nothing in it can go wrong the way real travel does.

### Scope
- An operations action to delay a flight by a number of hours or to cancel it, as a backend endpoint and an MCP tool.
- A flight keeps its scheduled times and gains its current ones, so the app can show both.
- The flight board, the boarding passes and the solar map show "Delayed" or "Cancelled" with the new time. On the map the ship follows the new times.
- My Bookings flags affected bookings. A cancelled flight offers a free cancellation.
- The hold service refuses new quotes and holds for a cancelled flight, and an open hold on it cannot be confirmed.
- **Out of scope:** automatic rebooking, compensation, real notifications by email or push.

### Touches
- `booking_system_backend/models.py`
- `booking_system_backend/schemas.py`
- `booking_system_backend/services/flight.py`
- `booking_system_backend/services/booking.py`
- `booking_system_backend/server.py`
- `booking_system_backend/seed.py`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/QuoteService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/HoldService.java`
- `booking_system_frontend/src/types/index.ts`
- `booking_system_frontend/src/solar/flights.ts`
- `booking_system_frontend/src/components/flights/FlightBoard.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/pages/MyBookings.tsx`
- `e2e/test_holds.py`

### Size
XL · all three services · more than 12 files. Schema change on `flights`, new behaviour in the hold service.

### Things to decide first
- Who may call the operations endpoint. The app has no authentication.
- There are no migrations: new columns on the existing `flights` table are not added automatically.
- Whether the status chip (#36) is built first, so "Delayed" extends it.

### Acceptance criteria
- [ ] A flight can be delayed or cancelled through the API and through an MCP tool
- [ ] The flight board, boarding passes and the map show the new status and time
- [ ] On the map, a delayed ship leaves at its new departure time
- [ ] Affected bookings are flagged on My Bookings
- [ ] No quote, hold or booking can be made on a cancelled flight
- [ ] Backend tests, Java tests and the end-to-end suite cover a delay and a cancellation

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_inventory_hold_service && mvn test
cd booking_system_frontend && npm run lint && npm test && npm run build
./test.sh
```
