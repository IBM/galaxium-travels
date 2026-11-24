A heart on each flight, a "Saved" page with the list, and saved flights marked on the solar map.

### Gap
A traveller cannot come back to a flight they were considering. Every travel site has a wishlist.

### Scope
- Heart toggle in the expanded row of the flight board. The row itself is a button, so the heart cannot sit inside the collapsed row.
- Saved flight ids stored in `localStorage` under `galaxium_saved_${userId}`, following the pattern in `holdStorage.ts`.
- New "Saved" page and a nav entry with a count badge.
- Saved flights get a small marker on their ship on the map.
- **Out of scope:** cross-device sync, price-drop alerts.

### Touches
- `booking_system_frontend/src/utils/savedStorage.ts` (new)
- `booking_system_frontend/src/pages/Saved.tsx` (new)
- `booking_system_frontend/src/App.tsx`
- `booking_system_frontend/src/components/flights/FlightBoard.tsx`
- `booking_system_frontend/src/components/layout/Header.tsx`
- `booking_system_frontend/src/components/solar/SolarScene.tsx`

### Size
M · frontend only · about 6 files, around 250 lines.

### Acceptance criteria
- [ ] Heart in each expanded flight row toggles the saved state
- [ ] "Saved" entry in the nav shows the number of saved flights
- [ ] The Saved page lists the saved flights with an unsave action and a way to book
- [ ] Saved ships are visibly marked on the solar map
- [ ] The state survives a reload for the logged-in user
- [ ] Unit tests cover the storage helper

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
