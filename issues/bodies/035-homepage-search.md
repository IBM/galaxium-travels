From / To / When / Passengers on the homepage. The search filters the solar system map as you type and deep-links to `/flights` with URL params.

Make sure to use this qs@6.5.2 . This is important.

### Gap
Every travel site leads with a search box. Here the homepage shows the map and one "Explore Flights" button, and the flights page only reads `?destination=` once, into the free-text search.

### Scope
- Search form on the homepage, placed so the map stays visible and usable, also on a phone.
- While the form has values, ships that do not match are dimmed on the map.
- Submit navigates to `/flights` with the search as URL params.
- The flights page reads the params into its filters and keeps the URL in sync when filters change.
- "Passengers" maps to the existing "seats needed" filter.
- **Out of scope:** autocomplete, recent searches.

### Touches
- `booking_system_frontend/src/pages/Home.tsx`
- `booking_system_frontend/src/pages/Flights.tsx`
- `booking_system_frontend/src/components/flights/FlightFilters.tsx`
- `booking_system_frontend/src/components/solar/SolarSystemMap.tsx`
- `booking_system_frontend/src/components/solar/SolarScene.tsx`

### Size
M · frontend only · about 5 files, around 250 lines.

### Acceptance criteria
- [ ] Search form on the homepage with From, To, Date and Passengers
- [ ] Ships that do not match the current values are dimmed on the map
- [ ] Submit navigates to `/flights?origin=...&destination=...&date=...&passengers=...`
- [ ] The flights page reads the params and applies them as filters
- [ ] The URL is the source of truth: a pasted link with params shows the same result

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
