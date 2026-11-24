Extras at checkout: extra cargo, Wi-Fi, travel insurance, a spacewalk. Each has a price in credits, and the total updates as they are ticked.

### Gap
Real travel checkout is mostly upsell. This one has none.

### Scope
- A catalog of at least five add-ons with fixed prices in credits, owned by the backend and served through a new endpoint. Suggested: extra cargo allowance, interstellar Wi-Fi, travel insurance, spacewalk excursion, pet pod.
- Add-ons must not repeat what a class already includes (see `seatClasses.ts`: gourmet meals, lounge access and the zero-G experience are class features).
- Selection on the hold step of the booking dialog, with a live total.
- The selection is stored with the booking and shown on the boarding pass.
- The backend computes the total from its own catalog and ignores prices sent by the client.
- First cut: add-ons apply to the whole booking.
- **Out of scope:** per-passenger add-ons, limited availability, changing add-ons after booking.

### Touches
- `booking_system_frontend/src/components/bookings/BookingModal.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/services/api.ts`
- `booking_system_frontend/src/types/index.ts`
- `booking_system_backend/models.py`
- `booking_system_backend/schemas.py`
- `booking_system_backend/services/booking.py`
- `booking_system_backend/server.py`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/service/HoldService.java`
- `booking_system_inventory_hold_service/src/main/java/com/galaxium/holdservice/client/PythonBackendClient.java`

### Size
L · all three services · about 10 files. Adds a column to `bookings` and a field to the Python–Java contract.

### Depends on
- #151. Today the backend recomputes the price when a hold is confirmed, so any total agreed at checkout is lost.

### Things to decide first
- How the selection reaches the booking. The booking is created by the Java service calling `/internal/bookings/from-hold`, so the add-ons either travel through Java or are attached by Python.
- There are no migrations: a new column on the existing `bookings` table is not added automatically.

### Acceptance criteria
- [ ] At least five add-ons with name, description and price in credits
- [ ] The total in the dialog updates as add-ons are toggled
- [ ] The selection and the total are stored with the booking and shown on the boarding pass
- [ ] The backend rejects unknown add-ons and ignores client-side prices
- [ ] Bookings made before this change still display
- [ ] Backend tests, Java tests and the end-to-end suite pass

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_inventory_hold_service && mvn test
cd booking_system_frontend && npm run lint && npm run build
./test.sh
```
