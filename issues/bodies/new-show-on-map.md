Open the solar system map focused on one flight or one planet through a link, for example `/?flight=4` or `/?body=mars`.

### Gap
What is selected on the map is local state in `SolarSystemMap.tsx`. Nothing can link to it, so the flight board and the destination pages have no way to say "show me this on the map".

### Scope
- The homepage reads `flight` and `body` from the URL and selects that ship or planet when the map loads.
- For a flight, the timeline jumps to its departure.
- Selecting or closing something on the map updates the URL without adding a history entry.
- "Show on map" link in the expanded row of the flight board and on the destination page.
- **Out of scope:** remembering the camera angle or the playback speed in the URL.

### Touches
- `booking_system_frontend/src/components/solar/SolarSystemMap.tsx`
- `booking_system_frontend/src/pages/Home.tsx`
- `booking_system_frontend/src/components/flights/FlightBoard.tsx`
- `booking_system_frontend/src/pages/DestinationDetail.tsx`

### Size
S · frontend only · about 4 files, under 150 lines.

### Acceptance criteria
- [ ] `/?flight=<id>` opens the map with that flight's panel open and the timeline at its departure
- [ ] `/?body=<slug>` opens the map with that planet's panel open
- [ ] An unknown id or slug is ignored and the map loads as usual
- [ ] Each expanded flight row and each destination page has a working "Show on map" link
- [ ] Closing the panel removes the parameter from the URL

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
