/**
 * Maps flights onto the solar system map. Pure TypeScript: no React, no three.js.
 *
 * Ship paths are cosmetic. Seeded transit times are hours, not the months a real
 * transfer takes, so there are no transfer orbits here: a ship follows a lifted
 * arc from where its origin is at departure to where its destination is at arrival.
 */
import { parseISO } from 'date-fns';
import type { Flight } from '../types';
import { BODY_IDS, bodyScenePosition } from './orbits';
import type { BodyId, Vec3 } from './orbits';

const HOUR_MS = 3_600_000;

/** Body for an origin or destination string, or null if the map does not know it. */
export const bodyIdForName = (name: string): BodyId | null => {
  const key = name.trim().toLowerCase();
  return BODY_IDS.find((id) => id === key) ?? null;
};

export interface MapFlight {
  flight: Flight;
  origin: BodyId;
  destination: BodyId;
  departMs: number;
  arriveMs: number;
  /** Parking offset from the body centre, so ships docked at the same body do not overlap. */
  slot: Vec3;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SLOT_RADIUS = 0.9;

const slotFor = (index: number): Vec3 => {
  const a = index * GOLDEN_ANGLE;
  return [SLOT_RADIUS * Math.cos(a), 0.35, SLOT_RADIUS * Math.sin(a)];
};

/**
 * Flights the map can draw. Flights with an unknown body or unparseable time are
 * skipped with a console warning rather than breaking the scene.
 */
export const toMapFlights = (flights: readonly Flight[]): MapFlight[] => {
  const result: MapFlight[] = [];
  for (const flight of flights) {
    const origin = bodyIdForName(flight.origin);
    const destination = bodyIdForName(flight.destination);
    const departMs = parseISO(flight.departure_time).getTime();
    const arriveMs = parseISO(flight.arrival_time).getTime();
    if (!origin || !destination) {
      console.warn(`Solar map: skipping flight ${flight.flight_id}, unknown body in "${flight.origin} → ${flight.destination}"`);
      continue;
    }
    if (!Number.isFinite(departMs) || !Number.isFinite(arriveMs) || arriveMs <= departMs) {
      console.warn(`Solar map: skipping flight ${flight.flight_id}, bad times "${flight.departure_time}" / "${flight.arrival_time}"`);
      continue;
    }
    // Slot depends on the flight id, not list order, so a ship keeps its place when filters change.
    result.push({ flight, origin, destination, departMs, arriveMs, slot: slotFor(flight.flight_id) });
  }
  return result;
};

export interface TimeWindow {
  startMs: number;
  endMs: number;
}

/** Earliest departure to latest arrival, padded. Null when there is nothing to show. */
export const flightWindow = (flights: readonly MapFlight[], paddingHours = 6): TimeWindow | null => {
  if (flights.length === 0) return null;
  const startMs = Math.min(...flights.map((f) => f.departMs)) - paddingHours * HOUR_MS;
  const endMs = Math.max(...flights.map((f) => f.arriveMs)) + paddingHours * HOUR_MS;
  return { startMs, endMs };
};

export type FlightPhase = 'docked' | 'enroute' | 'arrived';

export const flightPhase = (f: MapFlight, tMs: number): FlightPhase =>
  tMs < f.departMs ? 'docked' : tMs >= f.arriveMs ? 'arrived' : 'enroute';

/** Elapsed fraction of the flight, clamped to 0..1. */
export const flightProgress = (f: MapFlight, tMs: number): number =>
  Math.min(1, Math.max(0, (tMs - f.departMs) / (f.arriveMs - f.departMs)));

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export interface FlightArc {
  start: Vec3;
  control: Vec3;
  end: Vec3;
}

/** Quadratic Bezier from the origin at departure to the destination at arrival, lifted out of the ecliptic. */
export const flightArc = (f: MapFlight): FlightArc => {
  const start = add(bodyScenePosition(f.origin, f.departMs), f.slot);
  const end = add(bodyScenePosition(f.destination, f.arriveMs), f.slot);
  const span = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  const control: Vec3 = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.35 * span + 0.8, (start[2] + end[2]) / 2];
  return { start, control, end };
};

export const arcPoint = (arc: FlightArc, u: number): Vec3 => {
  const v = 1 - u;
  const mix = (n: 0 | 1 | 2) => v * v * arc.start[n] + 2 * v * u * arc.control[n] + u * u * arc.end[n];
  return [mix(0), mix(1), mix(2)];
};

export const arcPoints = (arc: FlightArc, segments = 48): Vec3[] =>
  Array.from({ length: segments + 1 }, (_, n) => arcPoint(arc, n / segments));

/** Where the ship is: docked at the origin, on the arc, or docked at the destination. */
export const shipPosition = (f: MapFlight, arc: FlightArc, tMs: number): Vec3 => {
  const phase = flightPhase(f, tMs);
  if (phase === 'docked') return add(bodyScenePosition(f.origin, tMs), f.slot);
  if (phase === 'arrived') return add(bodyScenePosition(f.destination, tMs), f.slot);
  return arcPoint(arc, flightProgress(f, tMs));
};

export const seatsLeft = (flight: Flight): number =>
  flight.economy_seats_available + flight.business_seats_available + flight.galaxium_seats_available;

/** Lowest price among classes that still have seats, or null when sold out. */
export const cheapestPrice = (flight: Flight): number | null => {
  const open = [
    [flight.economy_seats_available, flight.economy_price],
    [flight.business_seats_available, flight.business_price],
    [flight.galaxium_seats_available, flight.galaxium_price],
  ].filter(([seats]) => seats > 0);
  return open.length ? Math.min(...open.map(([, price]) => price)) : null;
};

export type Availability = 'plenty' | 'few' | 'soldOut';

export const FEW_SEATS_THRESHOLD = 3;

export const availability = (flight: Flight): Availability => {
  const seats = seatsLeft(flight);
  return seats === 0 ? 'soldOut' : seats <= FEW_SEATS_THRESHOLD ? 'few' : 'plenty';
};
