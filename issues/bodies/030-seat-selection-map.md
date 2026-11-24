A cabin layout for the chosen class in the booking dialog. Click a pod to pick it; taken pods are greyed out; the seat number appears on the boarding pass.

### Gap
A traveller picks a class, not a seat. A seat picker is one of the most recognisable interactions in any airline app.

### Scope
- A cabin map as a step in the booking dialog, between choosing the class and the quote.
- Cabins are small: a seeded flight has 6 Economy, 3 Business and 1 Galaxium seat. The layout comes from the capacity per class, which the flights API does not return today.
- The chosen seat travels with the booking: frontend → Python proxy → Java quote and hold → Python `/internal/bookings/from-hold` → the booking row.
- The backend rejects a seat that is already taken on that flight and class.
- New endpoint that lists the taken seats of a flight.
- **Out of scope:** changing a seat after booking, paid seat upgrades, several seats in one booking.

### Touches
- `booking_system_frontend/src/components/bookings/SeatMap.tsx` (new)
- `booking_system_frontend/src/components/bookings/BookingModal.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/services/api.ts`
- `booking_system_backend/models.py`
- `booking_system_backend/schemas.py`
- `booking_system_backend/services/booking.py`
- `booking_system_backend/server.py`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/api/dto/CreateQuoteRequest.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/domain/Quote.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/HoldService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/client/PythonBackendClient.java`
- `e2e/test_holds.py`

### Size
L · all three services · about 13 files. Adds a column to `bookings` and a field to the Python–Java contract.

### Things to decide first
- There are no database migrations. `create_all` creates new tables but does not add a column to an existing `bookings` table, so an existing local database or Postgres volume will not get the seat column on its own.
- A hold does not reserve a seat today. Two travellers can hold the same pod, and the second confirmation has to fail cleanly.

### Acceptance criteria
- [ ] The cabin map is a step in the booking dialog for the chosen class
- [ ] Taken seats are disabled and look different; the chosen seat is highlighted
- [ ] The seat number is stored with the booking and shown on the boarding pass
- [ ] The backend rejects a seat that is already booked on that flight and class
- [ ] Bookings made before this change still display
- [ ] Backend tests, Java tests and the end-to-end suite pass, including a test for two bookings of the same seat

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_inventory_hold_service && mvn test
cd booking_system_frontend && npm run lint && npm run build
./test.sh
```
