A page per flight at `/flights/:id`: route header, what each class includes, baggage and cancellation policies, and a mission timeline from launch to landing.

### Gap
A flight can only be seen as a row on the flight board or as a small panel on the solar map. There is no page to link to and no place for policies or a fuller picture of the trip.

### Scope
- New route and page.
- "Details" link in the expanded row of the flight board and in the map's flight panel. The row itself stays an expand toggle.
- Per-class amenities come from the existing `SEAT_CLASSES` config, with price and seats left per class.
- Baggage and cancellation policies as static config keyed by class.
- Mission timeline with four milestones (launch, transfer burn, orbital insertion, landing), computed from departure and arrival time.
- "Book this flight" opens the existing booking dialog.
- **Out of scope:** editable content, per-flight amenity overrides, reviews.

### Touches
- `booking_system_frontend/src/pages/FlightDetail.tsx` (new)
- `booking_system_frontend/src/App.tsx`
- `booking_system_frontend/src/components/flights/FlightBoard.tsx`
- `booking_system_frontend/src/components/solar/FlightPanel.tsx`
- `booking_system_frontend/src/services/api.ts`

### Size
M · frontend only · about 5 files, around 300 lines.

### Depends on
- #149 (`GET /flights/{flight_id}`), so the page can load one flight directly.

### Acceptance criteria
- [ ] The flight board and the map's flight panel link to `/flights/:id`
- [ ] The page shows origin, destination, dates and duration
- [ ] Amenities, price and seats left are shown for Economy, Business and Galaxium
- [ ] Baggage and cancellation policy sections are visible
- [ ] The mission timeline shows four milestones with their times
- [ ] "Book this flight" opens the booking dialog for that flight
- [ ] An unknown id shows a friendly not-found state

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
