A status chip on every flight: Scheduled, Check-in open, Boarding, Departed or Arrived.

### Gap
The flight board and the boarding passes on My Bookings never say whether a flight is about to leave or already gone. The solar map does show a phase, but it calls every moment before departure "Boarding", even days ahead.

### Scope
- One helper that turns departure time, arrival time and "now" into a status:
  Scheduled (more than 24h before departure), Check-in open (24h to 2h), Boarding (2h to 0h), Departed (after departure, before arrival), Arrived.
- Show the chip on flight board rows and on boarding passes, using the real time.
- Use the same helper for the map's flight panel and tooltip, with the map's simulated time as "now".
- Pure frontend, derived from timestamps.
- **Out of scope:** real delays or operational data.

### Touches
- `booking_system_frontend/src/utils/flightStatus.ts` (new)
- `booking_system_frontend/src/components/flights/FlightBoard.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/components/solar/FlightPanel.tsx`
- `booking_system_frontend/src/components/solar/SolarSystemMap.tsx`

### Size
S · frontend only · about 5 files plus a test, under 200 lines.

### Acceptance criteria
- [ ] Status chip visible on flight board rows and on boarding passes
- [ ] The map's flight panel shows the same five statuses, driven by the timeline
- [ ] Each status has its own colour from the palette in `tailwind.config.js`; the colours do not reuse the ones that already mean seat availability on the same row
- [ ] The chip updates without a page reload
- [ ] Unit tests cover all five statuses with a fixed "now"

### Notes
All seeded flights depart in 2099, so against the real time every flight reads "Scheduled". The map's timeline shows all five states today.

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
