When a quote, hold or confirmation fails, tell the traveller why: "This hold has expired", "No seats left in Business", "This quote is no longer valid".

### Gap
The booking dialog and the hold cards show one generic failure message. The reason is lost on the way: the Java hold service answers 400 and 404 with an empty body, and the Python proxy endpoints catch every HTTP error and return `{"error": "..."}` with status 200.

### Scope
- The hold service returns a body with an error code and a message for its failure cases: unknown quote, expired quote, unknown hold, expired hold, hold already confirmed or released, booking rejected by the Python backend.
- The Python proxy passes the status and the error code through instead of answering 200.
- The frontend maps each code to a sentence in the booking dialog and on the hold card, and offers the fitting next step (new quote, back to flights).
- Update the end-to-end test that currently expects an error inside a 200 response.
- **Out of scope:** retries, changing when holds expire.

### Touches
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/api/HoldController.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/api/QuoteController.java`
- `booking_system_backend/server.py`
- `booking_system_frontend/src/services/api.ts`
- `booking_system_frontend/src/components/bookings/BookingModal.tsx`
- `booking_system_frontend/src/components/bookings/HoldCard.tsx`
- `e2e/test_holds.py`

### Size
M · all three services · about 7 files. Changes the contract between Python and Java.

### Acceptance criteria
- [ ] Confirming an expired hold shows "This hold has expired" and offers a new quote
- [ ] Confirming a hold on a sold-out class shows that no seats are left
- [ ] The proxy endpoints answer with a 4xx status and an error code when the hold service rejects a request
- [ ] The frontend still shows a readable message when the hold service is down
- [ ] Java unit tests, backend tests and the end-to-end suite pass

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_inventory_hold_service && mvn test
cd booking_system_frontend && npm run lint && npm run build
./test.sh
```
