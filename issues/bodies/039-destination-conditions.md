Solar flare index, dust-storm forecast and orbital debris risk for each destination, on the destination page and in the planet panel of the solar map.

### Gap
The app sells a trip to Mars and says nothing about current conditions there. The destination page lists fixed hazards only.

### Scope
- Three indicators with a level each: Low, Moderate or High.
- Mocked data, generated from the destination name and the date, so the values are stable within a day and differ between destinations.
- One widget, used on the destination page and in the map's planet panel.
- Pure frontend.
- **Out of scope:** real space weather APIs.

### Touches
- `booking_system_frontend/src/data/destinationConditions.ts` (new)
- `booking_system_frontend/src/components/common/ConditionsWidget.tsx` (new)
- `booking_system_frontend/src/pages/DestinationDetail.tsx`
- `booking_system_frontend/src/components/solar/BodyPanel.tsx`

### Size
S · frontend only · about 4 files plus a test, under 200 lines.

### Acceptance criteria
- [ ] The widget shows three indicators labelled Low, Moderate or High
- [ ] Values are the same all day for a destination and change with the date
- [ ] The widget appears on every destination page and in the planet panel on the map
- [ ] Styling follows the existing panels and uses the palette in `tailwind.config.js`
- [ ] A unit test covers the generator: same input gives the same output, another date gives another

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
