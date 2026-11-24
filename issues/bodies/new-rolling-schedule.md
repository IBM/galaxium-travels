Seed the demo flights relative to today, so the app always has departures in the coming days instead of in January 2099.

### Gap
Every seeded flight departs in 2099. Anything that depends on how close a departure is can never be seen in the running app: flight status always reads "Scheduled", a refund preview is always "full refund", check-in never opens. The homepage also hard-codes "Live departures · January 2099" and "Seven worlds, ten flights".

### Scope
- `seed.py` creates the same ten routes with departures spread over the next ten days, the first one within 24 hours.
- Keep the stored timestamp format (ISO 8601 with a `Z`).
- The homepage headline takes the month, the number of worlds and the number of flights from the loaded flights.
- Move all flights together. The solar map's timeline runs from the earliest departure to the latest arrival, so a mix of near-term and 2099 flights would stretch it across decades.
- **Out of scope:** re-dating flights in a database that was seeded earlier, recurring schedules.

### Touches
- `booking_system_backend/seed.py`
- `booking_system_backend/tests/test_seed.py` (new)
- `booking_system_frontend/src/pages/Home.tsx`
- `booking_system_frontend/src/components/solar/SolarSystemMap.tsx`

### Size
M · frontend and Python backend · about 4 files, around 150 lines. No schema change.

### Acceptance criteria
- [ ] On a fresh database, all ten flights depart within the next ten days and the first within 24 hours
- [ ] Seeded bookings still point at valid flights
- [ ] The solar map's timeline spans about ten days and starts near today
- [ ] The homepage headline shows the current month and the real number of worlds and flights
- [ ] A backend test checks the seeded dates against an injected "today"

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_frontend && npm run lint && npm test && npm run build
./test.sh
```
