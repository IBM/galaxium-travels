A loyalty program: a profile page with the traveller's tier (Meteor → Comet → Nova → Nebula), miles balance, progress to the next tier and a ledger of miles earned per booking.

### Gap
There is no profile page, no loyalty program and no reason to come back.

### Scope
- Each booking earns miles: route distance × class multiplier.
- The backend has no distance data. Add a fixed distance per route to the backend; the orbit maths in the frontend is for drawing, not for accounting.
- A ledger table with one entry per booking and a reversing entry on cancel.
- Tier thresholds as constants in code.
- Profile page, and a tier badge next to the user name in the header.
- Seeded bookings get ledger entries, so the demo users start with a balance.
- **Out of scope:** spending miles, partner programs, expiry.

### Touches
- `booking_system_frontend/src/pages/Profile.tsx` (new)
- `booking_system_frontend/src/App.tsx`
- `booking_system_frontend/src/components/layout/Header.tsx`
- `booking_system_frontend/src/services/api.ts`
- `booking_system_backend/models.py`
- `booking_system_backend/schemas.py`
- `booking_system_backend/services/booking.py`
- `booking_system_backend/services/loyalty.py` (new)
- `booking_system_backend/server.py`
- `booking_system_backend/seed.py`

### Size
L · frontend and Python backend · about 10 files. Adds a table.

### Notes
- Every booking, whether made directly or through a confirmed hold, goes through `book_flight`. That is the one place to write the ledger entry.
- A new table is created automatically on start. No existing table changes.

### Acceptance criteria
- [ ] `/profile` shows the current tier, the miles balance and the progress to the next tier
- [ ] The ledger lists date, flight and miles for each booking
- [ ] The header shows the tier badge next to the user name
- [ ] Confirming a booking adds a ledger entry; cancelling it reverses the entry
- [ ] The miles formula is documented in code and covered by backend tests
- [ ] Seeded users have a balance on a fresh database

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_frontend && npm run lint && npm run build
./test.sh
```
