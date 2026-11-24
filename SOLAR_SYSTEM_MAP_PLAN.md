# Solar System Map: 3D booking view

Rough plan for an implementing agent. Read `AGENTS.md` first; its footguns and edit hooks apply.

## Goal

Make a live 3D solar system the main way to browse and book flights. The seven seeded bodies move on their orbits, each flight is a ship travelling from origin to destination, and clicking a ship opens the existing booking flow. A time scrubber moves the whole scene through the flight schedule.

This is a demo feature. It should look impressive in a 30-second screen recording and stay honest about what is real physics and what is not.

## Scope

In scope:

- Frontend only, in `booking_system_frontend/`.
- A 3D scene, a simulation clock with scrubber, ships for flights, click-to-book, planet info panel.
- The existing list view stays as a fallback.

Out of scope (separate ideas, do not start them):

- Pricing from orbital mechanics, or any change to `PricingService` or backend pricing.
- Any backend, Java or database change. No new endpoints, no new fields.
- A live event stream of holds and bookings.

## What exists today

- React 19, Vite 7, TypeScript 5.9, Tailwind 3 with a custom palette (`space-dark`, `space-blue`, `cosmic-purple`, `nebula-pink`, `alien-green`, `solar-orange`, `star-white`). Do not assume standard Tailwind colour names.
- Only `framer-motion` for animation. No three.js, no chart or canvas library. `components/common/Starfield.tsx` is a hand-written 2D canvas behind every page.
- Routes in `src/App.tsx`: `/`, `/flights`, `/bookings`, `/destinations/:slug`.
- `getFlights()` in `src/services/api.ts` returns `Flight[]` (`src/types/index.ts`): origin, destination, departure and arrival time strings, per-class seats and prices.
- `components/bookings/BookingModal.tsx` already runs the whole quote, hold and confirm flow for one flight. Reuse it unchanged.
- `src/data/destinations.ts` has display facts per body (text only, no coordinates) and accent colours.
- Seed data: 10 flights between Earth, Mars, Moon, Venus, Jupiter, Europa and Pluto, all in January 2099, 10 seats each.
- No frontend unit test runner. Checks are `tsc -b` and `eslint`, run by hooks after every `.ts`/`.tsx` edit.

Not verified, check before relying on it:

- The exact format of `departure_time` / `arrival_time` (see `booking_system_backend/seed.py`).
- The exact origin and destination strings, and that they match the `name` values in `destinations.ts`.
- That `SEED_DEMO_DATA` produces the same flight times on every start.

## Design decisions

**Libraries.** `three`, `@react-three/fiber` and `@react-three/drei`. Use the fiber major that supports React 19 and check current versions before installing. Add a post-processing library only if bloom is needed in the last milestone.

**Entry point.** Add a Map / List toggle to `/flights`, with Map as the default. `FlightFilters` applies to both views. Do not add a separate route. Load the 3D view with `React.lazy` so three.js stays out of the Home page bundle.

**Orbits.** Use the JPL approximate Keplerian elements (J2000 values plus per-century rates) for Venus, Earth, Mars, Jupiter and Pluto, and solve Kepler's equation for position at a given date. The published table is fitted for 1800 to 2050, so 2099 positions are approximate. That is fine for a visual; say so in a code comment. The Moon and Europa get plain circular orbits around their parent.

**Scale.** True scale is unusable: Pluto sits at about 39 AU and Venus at 0.7. Compress orbital radius with a monotonic function (a power or log curve), exaggerate body sizes, and exaggerate the Moon and Europa orbit radii so they are visible next to their parents. Keep angles true so alignments are real.

**Ship paths are cosmetic.** Seeded transit times are hours, not the months a real transfer takes, so do not compute transfer orbits. Draw a curved arc from the origin's position at departure to the destination's position at arrival, and place the ship along it by elapsed fraction of the flight. Flights that have not departed sit at the origin; arrived flights disappear or dock.

**Simulation clock.** One shared clock (React context or a small store) holding the current simulated time and play speed. Range: earliest departure to latest arrival across the loaded flights, with some padding. It starts at the earliest departure, paused or playing slowly. Controls: play/pause, speed, and a scrubber with a tick per departure.

**Interaction.**

- Hover a ship: label with route, departure, cheapest price and seats left.
- Click a ship: open `BookingModal` for that flight.
- Click a body: camera flies to it and a side panel shows facts from `destinations.ts`, the flights departing from and arriving at it, and a link to `/destinations/:slug`.
- Ship colour encodes availability (plenty, few, sold out) using the palette tokens.

**Fallback.** If WebGL is unavailable or the scene throws, show the list view. Wrap the scene in an error boundary.

## Milestones

1. **Orbit maths.** A pure TypeScript module: date in, position per body out, plus the radius compression function. No React, no three.js. Add `vitest` and test it: Earth is at about 1 AU, a known date gives a known heliocentric longitude within a degree or two, the Moon stays near Earth.
2. **Static scene.** Sun, seven bodies, orbit lines, a star background, orbit camera controls. Bodies sit at their positions for a fixed date.
3. **Clock and scrubber.** Bodies move as time changes. Scrubbing is smooth.
4. **Ships.** Fetch flights, map origin and destination strings to bodies, render arcs and moving ships. Filters hide ships.
5. **Booking and info panel.** Click-to-book through `BookingModal`, body panel, camera fly-to. Booking a seat updates the ship's availability colour after refetch.
6. **Polish.** Sun glow, body colours or simple textures, labels, toggle on `/flights`, error boundary, lazy loading. Decide whether the 2D `Starfield` is hidden while the map is open.

Each milestone should leave the app working.

## Verification

- Hooks run `tsc -b` and `eslint` after each edit. If a tool call is blocked, read `.bob/hooks/state/.last-block`.
- `npm run build` in `booking_system_frontend/` must pass. Note the size of the lazy three.js chunk.
- `vitest` for the orbit module. If you add it, add an `npm test` script and mention the frontend unit suite in the `verify` skill (`.bob/skills/verify/SKILL.md`).
- Run the `verify` skill, fast tier. No backend files change, so e2e is not needed.
- Manual check with `./start.sh`: load `/flights`, scrub through January 2099, book one seat from a ship with a hold and confirm, check the booking shows on `/bookings`, switch to List and back. Take screenshots with the Playwright MCP server.

## Risks

- The React 19 and fiber version pairing. Settle this in milestone 1 before writing scene code.
- Scale tuning takes iteration. Budget time for it in milestone 2 rather than at the end.
- Ten ships in a 39 AU system can look empty. If so, tighten the compression or frame the default camera on the inner system with Pluto reachable by zoom.
- Origin strings that do not map to a body must be skipped with a console warning, not crash the scene.
