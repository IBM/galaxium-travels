import type { Availability } from './flights';
import type { BodyId } from './orbits';

interface BodyStyle {
  /** Display name. Matches the `name` in data/destinations.ts and the flight origin/destination strings. */
  label: string;
  /** Representative colour, used for orbit lines and UI dots. */
  color: string;
  /** Scene units. Sizes are exaggerated and not to scale with each other. */
  radius: number;
  /** Axial tilt in degrees (real values, rounded). */
  tilt: number;
  /** Cosmetic spin in radians per real second. Not tied to the simulation clock. */
  spin: number;
  /** Atmosphere rim colour, or null for airless bodies. */
  atmosphere: string | null;
}

export const BODY_STYLE: Record<BodyId, BodyStyle> = {
  venus: { label: 'Venus', color: '#E8C27A', radius: 0.8, tilt: 3, spin: 0.03, atmosphere: '#F6D38A' },
  earth: { label: 'Earth', color: '#3B82F6', radius: 0.86, tilt: 23, spin: 0.12, atmosphere: '#5AA9FF' },
  mars: { label: 'Mars', color: '#D9603B', radius: 0.68, tilt: 25, spin: 0.11, atmosphere: '#E08A62' },
  jupiter: { label: 'Jupiter', color: '#D8A774', radius: 1.5, tilt: 3, spin: 0.2, atmosphere: '#E9C9A0' },
  pluto: { label: 'Pluto', color: '#B9A6D6', radius: 0.5, tilt: 57, spin: 0.04, atmosphere: null },
  moon: { label: 'Moon', color: '#C8CCD4', radius: 0.26, tilt: 7, spin: 0.03, atmosphere: null },
  europa: { label: 'Europa', color: '#BFE9E0', radius: 0.3, tilt: 0, spin: 0.05, atmosphere: null },
};

export const SUN_RADIUS = 1.8;
export const SUN_COLOR = '#FDB813';

// Palette tokens from tailwind.config.js: alien-green, solar-orange, nebula-pink.
export const AVAILABILITY_COLOR: Record<Availability, string> = {
  plenty: '#10B981',
  few: '#F59E0B',
  soldOut: '#EC4899',
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  plenty: 'Seats available',
  few: 'Few seats left',
  soldOut: 'Sold out',
};

/** Resting view: a low, slightly raised look across the inner system. Pluto is reachable by dragging round. */
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 13, 35];
/** The camera starts here and settles into the resting view. */
export const INTRO_CAMERA_POSITION: [number, number, number] = [0, 70, 105];
