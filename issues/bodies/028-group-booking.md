Book several seats in one go: a passenger count in the booking dialog, a total that updates live, one reservation for the group.

### Gap
A traveller can only book one seat at a time. The pieces are half there:
- The Java hold service accepts a `quantity` on a quote and multiplies the price by it.
- When the hold is confirmed, `HoldService.confirmHold` does not pass the quantity on.
- The Python backend always books exactly one seat: it checks for one free seat, takes one off the count and stores the price of one.
- The booking dialog hard-codes a quantity of 1.

So a quote for three seats is priced for three and books one.

### Scope
- Passenger count in the booking dialog, limited to the seats left in the chosen class and to 6 at most. A seeded flight has 6 Economy, 3 Business and 1 Galaxium seat.
- The quantity travels through the hold confirmation to `/internal/bookings/from-hold`.
- The Python backend checks, books and, on cancel, releases that many seats.
- The boarding pass shows the number of seats.
- All seats in one class.
- **Out of scope:** names and details per passenger, mixed classes, removing single passengers after booking.

### Touches
- `booking_system_frontend/src/components/bookings/BookingModal.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/types/index.ts`
- `booking_system_backend/models.py`
- `booking_system_backend/schemas.py`
- `booking_system_backend/services/booking.py`
- `booking_system_backend/server.py`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/HoldService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/client/PythonBackendClient.java`
- `e2e/test_holds.py`

### Size
L · all three services · about 10 files. Changes the Python–Java contract and how a booking is stored.

### Things to decide first
- One booking row with a seat count, or one row per seat. A new column on the existing `bookings` table is not added automatically, because there are no migrations.
- Which price is stored. Today the backend recomputes the price at confirmation and ignores the quote, see #151.

### Acceptance criteria
- [ ] The booking dialog lets the traveller choose 1 to 6 seats, never more than are left in the class
- [ ] The total in the dialog matches the quote for that quantity
- [ ] Confirming the hold reduces the available seats by the quantity
- [ ] Cancelling returns all seats of the booking
- [ ] A group larger than the seats left is rejected with a clear message
- [ ] Backend tests, Java tests and the end-to-end suite pass, including a hold for more than one seat

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_inventory_hold_service && mvn test
cd booking_system_frontend && npm run lint && npm run build
./test.sh
```
