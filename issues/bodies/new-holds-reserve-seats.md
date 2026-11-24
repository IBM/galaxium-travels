Make a hold do what the app says it does: take the seat off sale for 15 minutes and give it back when the hold expires or is released.

This is an epic. Split it into smaller issues before building.

### Gap
The booking dialog says "Your seat is reserved" and the hold card says "Seat reserved for you", but a hold reserves nothing. Seat counts only change when a hold is confirmed. Two travellers can hold the last seat, and one of them fails at confirmation. The end-to-end suite documents this behaviour.

### Scope
- Creating a hold takes the seats out of the available count; expiry and release return them.
- The flight board and the solar map show held seats, for example "2 left · 1 held".
- Confirming a hold must not take the seat a second time.
- The seat count lives in the Python backend, the hold in the Java service. Decide which service owns the reservation and how the two stay consistent when one of them is down or a call fails halfway.
- The scheduler that expires holds has to return seats exactly once.
- **Out of scope:** waiting lists, overbooking, holds longer than today's 15 minutes.

### Touches
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/HoldService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/scheduler/HoldExpirationScheduler.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/client/PythonBackendClient.java`
- `booking_system_backend/models.py`
- `booking_system_backend/schemas.py`
- `booking_system_backend/services/booking.py`
- `booking_system_backend/services/flight.py`
- `booking_system_backend/server.py`
- `booking_system_frontend/src/components/flights/FlightBoard.tsx`
- `booking_system_frontend/src/utils/seatClasses.ts`
- `e2e/test_holds.py`

### Size
XL · all three services · more than 10 files. New internal endpoints, a schema change, and a change in behaviour that existing tests assert.

### Acceptance criteria
- [ ] Holding a seat lowers the seats available on that flight and class
- [ ] Releasing a hold, or letting it expire, returns the seat exactly once
- [ ] The last seat cannot be held by two travellers at the same time
- [ ] Confirming a hold does not change the available count again
- [ ] The flight board shows how many seats are held
- [ ] The end-to-end suite covers hold, expiry, release and a contested last seat

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_inventory_hold_service && mvn test
cd booking_system_frontend && npm run lint && npm run build
E2E_RUN_SLOW=1 ./test.sh
```
