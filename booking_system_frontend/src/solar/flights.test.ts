import { describe, expect, it, vi } from 'vitest';
import type { Flight } from '../types';
import {
  arcPoint,
  availability,
  bodyIdForName,
  cheapestPrice,
  flightArc,
  flightPhase,
  flightWindow,
  shipPosition,
  toMapFlights,
} from './flights';
import { bodyScenePosition } from './orbits';
import { createSimClock } from './simClock';

const flight = (over: Partial<Flight> = {}): Flight => ({
  flight_id: 1,
  origin: 'Earth',
  destination: 'Mars',
  departure_time: '2099-01-01T09:00:00Z',
  arrival_time: '2099-01-01T17:00:00Z',
  base_price: 1_000_000,
  economy_seats_available: 6,
  business_seats_available: 3,
  galaxium_seats_available: 1,
  economy_price: 1_000_000,
  business_price: 2_500_000,
  galaxium_price: 5_000_000,
  ...over,
});

const HOUR = 3_600_000;

describe('bodyIdForName', () => {
  it('matches the seeded names regardless of case', () => {
    for (const name of ['Earth', 'Mars', 'Moon', 'Venus', 'Jupiter', 'Europa', 'Pluto']) {
      expect(bodyIdForName(name)).toBe(name.toLowerCase());
    }
    expect(bodyIdForName(' earth ')).toBe('earth');
    expect(bodyIdForName('Titan')).toBeNull();
  });
});

describe('toMapFlights', () => {
  it('parses times as UTC instants', () => {
    const [f] = toMapFlights([flight()]);
    expect(f.departMs).toBe(Date.UTC(2099, 0, 1, 9));
    expect(f.arriveMs).toBe(Date.UTC(2099, 0, 1, 17));
  });

  it('skips unknown bodies and bad times with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mapped = toMapFlights([
      flight(),
      flight({ flight_id: 2, destination: 'Titan' }),
      flight({ flight_id: 3, arrival_time: 'soon' }),
      flight({ flight_id: 4, arrival_time: '2099-01-01T08:00:00Z' }),
    ]);
    expect(mapped.map((f) => f.flight.flight_id)).toEqual([1]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe('ship path', () => {
  const [f] = toMapFlights([flight()]);
  const arc = flightArc(f);
  const near = (a: readonly number[], b: readonly number[]) => a.forEach((v, n) => expect(v).toBeCloseTo(b[n], 4));
  const withSlot = (p: readonly number[]) => p.map((v, n) => v + f.slot[n]);

  it('reports the phase', () => {
    expect(flightPhase(f, f.departMs - 1)).toBe('docked');
    expect(flightPhase(f, f.departMs)).toBe('enroute');
    expect(flightPhase(f, f.arriveMs)).toBe('arrived');
  });

  it('starts at the origin and ends at the destination with no jump', () => {
    near(arcPoint(arc, 0), withSlot(bodyScenePosition('earth', f.departMs)));
    near(arcPoint(arc, 1), withSlot(bodyScenePosition('mars', f.arriveMs)));
    near(shipPosition(f, arc, f.departMs - 1), shipPosition(f, arc, f.departMs));
    near(shipPosition(f, arc, f.arriveMs - 1), shipPosition(f, arc, f.arriveMs));
  });

  it('rides with the body while docked', () => {
    near(shipPosition(f, arc, f.departMs - 48 * HOUR), withSlot(bodyScenePosition('earth', f.departMs - 48 * HOUR)));
    near(shipPosition(f, arc, f.arriveMs + 48 * HOUR), withSlot(bodyScenePosition('mars', f.arriveMs + 48 * HOUR)));
  });
});

describe('flightWindow', () => {
  it('pads the earliest departure and latest arrival', () => {
    const mapped = toMapFlights([
      flight(),
      flight({ flight_id: 2, departure_time: '2099-01-10T06:00:00Z', arrival_time: '2099-01-11T06:00:00Z' }),
    ]);
    expect(flightWindow(mapped, 6)).toEqual({
      startMs: Date.UTC(2099, 0, 1, 3),
      endMs: Date.UTC(2099, 0, 11, 12),
    });
    expect(flightWindow([])).toBeNull();
  });
});

describe('availability and price', () => {
  it('buckets seats left', () => {
    expect(availability(flight())).toBe('plenty');
    expect(availability(flight({ economy_seats_available: 2, business_seats_available: 1, galaxium_seats_available: 0 }))).toBe('few');
    expect(availability(flight({ economy_seats_available: 0, business_seats_available: 0, galaxium_seats_available: 0 }))).toBe('soldOut');
  });

  it('ignores sold-out classes when finding the cheapest price', () => {
    expect(cheapestPrice(flight())).toBe(1_000_000);
    expect(cheapestPrice(flight({ economy_seats_available: 0 }))).toBe(2_500_000);
    expect(cheapestPrice(flight({ economy_seats_available: 0, business_seats_available: 0, galaxium_seats_available: 0 }))).toBeNull();
  });
});

describe('sim clock', () => {
  it('advances only while playing and stops at the end', () => {
    const clock = createSimClock(0, 10 * HOUR);
    clock.tick(1);
    expect(clock.getState().timeMs).toBe(0);
    clock.setSpeed(6);
    clock.setPlaying(true);
    clock.tick(1);
    expect(clock.getState().timeMs).toBe(6 * HOUR);
    clock.tick(1);
    expect(clock.getState()).toMatchObject({ timeMs: 10 * HOUR, playing: false });
  });

  it('restarts from the beginning when played at the end', () => {
    const clock = createSimClock(0, 10 * HOUR);
    clock.setTime(99 * HOUR);
    expect(clock.getState().timeMs).toBe(10 * HOUR);
    clock.setPlaying(true);
    expect(clock.getState().timeMs).toBe(0);
  });

  it('keeps the current time when the range changes around it', () => {
    const clock = createSimClock();
    clock.setRange(2 * HOUR, 10 * HOUR);
    expect(clock.getState().timeMs).toBe(2 * HOUR);
    clock.setTime(5 * HOUR);
    clock.setRange(0, 20 * HOUR);
    expect(clock.getState().timeMs).toBe(5 * HOUR);
    clock.setRange(8 * HOUR, 20 * HOUR);
    expect(clock.getState().timeMs).toBe(8 * HOUR);
  });

  it('notifies subscribers and returns a stable snapshot between changes', () => {
    const clock = createSimClock(0, 10 * HOUR);
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    expect(clock.getState()).toBe(clock.getState());
    clock.setTime(HOUR);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    clock.setTime(2 * HOUR);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
