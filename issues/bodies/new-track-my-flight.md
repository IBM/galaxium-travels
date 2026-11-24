Show the traveller's own booked flights on the solar system map, and let them jump from a boarding pass to their ship.

### Gap
The map shows every flight the same way. A logged-in traveller cannot tell which ships they are booked on, and My Bookings has no link to the map.

### Scope
- When a user is logged in, the homepage loads their bookings and marks the ships of active bookings on the map ("Your flight").
- The flight panel of a booked flight says so and links to My Bookings instead of offering to book again.
- "Track on map" link on each active boarding pass.
- **Out of scope:** notifications, tracking cancelled or past bookings.

### Touches
- `booking_system_frontend/src/pages/Home.tsx`
- `booking_system_frontend/src/components/solar/SolarSystemMap.tsx`
- `booking_system_frontend/src/components/solar/SolarScene.tsx`
- `booking_system_frontend/src/components/solar/FlightPanel.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`

### Size
M · frontend only · about 5 files, around 200 lines.

### Depends on
- "Show on map: link straight to a flight or a planet", for the link from the boarding pass.

### Acceptance criteria
- [ ] Ships with an active booking of the logged-in user carry a visible marker
- [ ] The marker disappears after logging out or cancelling the booking
- [ ] The flight panel of a booked flight shows "You're on this flight" and a link to My Bookings
- [ ] "Track on map" on a boarding pass opens the map focused on that ship
- [ ] The map still loads when the bookings request fails

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
