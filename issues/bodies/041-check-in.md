A "Check in" button on the boarding pass that opens 24 hours before departure and marks the booking as checked in.

### Gap
Check-in is a standard moment in any travel app. It is missing entirely.

### Scope
- New booking status `checked_in`.
- Backend endpoint `POST /bookings/{booking_id}/check-in`, allowed only from 24 hours before departure until departure.
- "Check in" button on the boarding pass inside that window; a "Checked in" chip afterwards.
- A checked-in booking stays under the active bookings on My Bookings.
- Decide and document whether a checked-in booking can still be cancelled. Today `cancel_booking` only refuses bookings that are already cancelled.
- **Out of scope:** seat changes at check-in, document verification.

### Touches
- `booking_system_backend/services/booking.py`
- `booking_system_backend/server.py`
- `booking_system_backend/tests/test_services.py`
- `booking_system_frontend/src/types/index.ts`
- `booking_system_frontend/src/services/api.ts`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/pages/MyBookings.tsx`

### Size
M · frontend and Python backend · about 7 files, around 250 lines. The status column is free text, so there is no schema change.

### Depends on
- "Rolling schedule: flights that depart this week". With every seeded flight in 2099 the check-in window never opens in the running app.

### Acceptance criteria
- [ ] "Check in" is visible on a boarding pass only within 24 hours before departure
- [ ] Checking in changes the status and shows a "Checked in" chip instead of the button
- [ ] The backend rejects check-in outside the window, for a cancelled booking, and for an unknown booking
- [ ] A checked-in booking is listed under active bookings
- [ ] Backend tests cover the window with an injected "now", in both timestamp formats

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_frontend && npm run lint && npm run build
```
