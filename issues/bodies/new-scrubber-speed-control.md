Let the traveller choose how fast time runs on the solar system map: 1×, 6× or 24×.

### Gap
The clock already has a speed setting (`SPEEDS` and `setSpeed` in `simClock.ts`), but the timeline has no control for it. The setting also has no effect today: the clock driver in `SolarScene.tsx` divides the frame time by the speed and `tick` multiplies it back.

### Scope
- A three-step speed toggle next to play/pause on the timeline.
- Make the speed actually change how fast the ships move.
- Keep the existing behaviour where time slows down while a ship is in flight.
- **Out of scope:** reverse playback, a free speed slider.

### Touches
- `booking_system_frontend/src/components/solar/TimeScrubber.tsx`
- `booking_system_frontend/src/components/solar/SolarScene.tsx`
- `booking_system_frontend/src/solar/simClock.ts`
- `booking_system_frontend/src/solar/flights.test.ts`

### Size
S · frontend only · about 4 files, under 100 lines.

### Acceptance criteria
- [ ] The timeline shows a 1× / 6× / 24× control with the current speed marked
- [ ] At 24× the same stretch of the timeline passes four times faster than at 6×
- [ ] The control works with keyboard and has an accessible label
- [ ] A unit test covers the speed change

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
