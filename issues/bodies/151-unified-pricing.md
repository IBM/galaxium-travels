Show one price for a seat everywhere: on the flight board, in the quote and on the booking.

### Gap
Flight prices differ along the booking journey:
- **Flight board:** the Python backend computes class prices in `_flight_to_out()` as the flight's base price × 1.0, 2.5 or 5.0.
- **Quote:** the Java `PricingService.calculatePrice()` ignores the flight's base price. It uses a fixed table (`economy` 500k, `business` 2.5M, `first` 5M) and a multiplier derived from `flightId % 3`.
- **Class name:** Java knows `first`, the rest of the system says `galaxium`. A Galaxium quote falls back to the economy price.
- **Booking:** `HoldService.confirmHold()` does not send the quoted price to `/internal/bookings/from-hold`. Python computes the price again and stores a different value than the traveller was quoted.

### Scope
1. **Single source of truth:** the Python backend is the authority on prices. The Java `PricingService` gets the price from Python instead of its own table.
2. **Class names:** `economy`, `business` and `galaxium` in all services. A quote for any other class is rejected.
3. **Lock the quoted price:** Java sends the quoted price and the quote id when it confirms a hold.
4. **Honour it:** Python stores the quoted price in `Booking.price_paid`.
- **Out of scope:** dynamic pricing, discounts, currencies.

### Touches
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/PricingService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/QuoteService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/HoldService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/client/PythonBackendClient.java`
- `booking_system_backend/server.py`
- `booking_system_backend/services/booking.py`
- `booking_system_backend/services/flight.py`
- `e2e/test_holds.py`

### Size
L · Python backend and Java hold service · about 8 files. Changes the Python–Java contract.

### Depends on
- #149 (`GET /flights/{flight_id}`), as the way for Java to look up a flight's prices.

### Acceptance criteria
- [ ] The price on the flight board matches the price in the quote, for every flight and class
- [ ] A quote for `galaxium` uses the 5.0× multiplier
- [ ] A quote for an unknown class is rejected
- [ ] The `price_paid` of a confirmed booking equals the quote's total
- [ ] The `flightId % 3` multiplier is gone
- [ ] Java unit tests cover `PricingService`, and the end-to-end suite asserts the price

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_inventory_hold_service && mvn test
./test.sh
```
