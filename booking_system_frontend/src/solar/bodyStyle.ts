import type { Availability } from './flights';
import type { BodyId } from './orbits';

interface BodyStyle {
  /** Display name. Matches the `name` in data/destinations.ts and the flight origin/destination strings. */
  label: string;
  color: string;
  /** Scene units. Sizes are exaggerated and not to scale with each other. */
  radius: number;
}

export const BODY_STYLE: Record<BodyId, BodyStyle> = {
  venus: { label: 'Venus', color: '#E8C27A', radius: 0.5 },
  earth: { label: 'Earth', color: '#3B82F6', radius: 0.55 },
  mars: { label: 'Mars', color: '#D9603B', radius: 0.45 },
  jupiter: { label: 'Jupiter', color: '#D8A774', radius: 1.2 },
  pluto: { label: 'Pluto', color: '#B9A6D6', radius: 0.4 },
  moon: { label: 'Moon', color: '#C8CCD4', radius: 0.2 },
  europa: { label: 'Europa', color: '#BFE9E0', radius: 0.24 },
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

/** Default view: looking down on the inner system. Pluto is reachable by zooming out. */
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 30, 36];
