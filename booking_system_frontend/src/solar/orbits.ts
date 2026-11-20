/**
 * Orbit maths for the solar system map. Pure TypeScript: no React, no three.js.
 *
 * What is real and what is not:
 * - Planet positions come from the JPL "approximate positions of the planets"
 *   Keplerian elements (J2000 values plus per-century rates). That table is
 *   fitted for 1800 to 2050, so positions for the seeded 2099 flights are
 *   extrapolated and only approximate. Good enough for a visual.
 * - "Earth" uses the Earth-Moon barycentre elements.
 * - The Moon and Europa get plain circular orbits in the ecliptic plane.
 *   The Moon's phase is anchored to its real mean longitude; Europa's phase
 *   is arbitrary.
 * - Scene coordinates compress orbital radius and exaggerate moon orbits.
 *   Angles are kept true, so alignments between planets are real.
 */

export type PlanetId = 'venus' | 'earth' | 'mars' | 'jupiter' | 'pluto';
export type MoonId = 'moon' | 'europa';
export type BodyId = PlanetId | MoonId;

/** [x, y, z] */
export type Vec3 = readonly [number, number, number];

export const PLANET_IDS: readonly PlanetId[] = ['venus', 'earth', 'mars', 'jupiter', 'pluto'];
export const MOON_IDS: readonly MoonId[] = ['moon', 'europa'];
export const BODY_IDS: readonly BodyId[] = [...PLANET_IDS, ...MOON_IDS];

const DEG = Math.PI / 180;
const MS_PER_DAY = 86_400_000;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DAYS_PER_CENTURY = 36_525;

/** Each element is [value at J2000, change per Julian century]. */
interface KeplerElements {
  a: readonly [number, number]; // semi-major axis, AU
  e: readonly [number, number]; // eccentricity
  i: readonly [number, number]; // inclination, deg
  L: readonly [number, number]; // mean longitude, deg
  peri: readonly [number, number]; // longitude of perihelion, deg
  node: readonly [number, number]; // longitude of ascending node, deg
}

// JPL Solar System Dynamics, "Approximate Positions of the Planets", table 1.
const ELEMENTS: Record<PlanetId, KeplerElements> = {
  venus: {
    a: [0.72333566, 0.0000039],
    e: [0.00677672, -0.00004107],
    i: [3.39467605, -0.0007889],
    L: [181.9790995, 58517.81538729],
    peri: [131.60246718, 0.00268329],
    node: [76.67984255, -0.27769418],
  },
  earth: {
    a: [1.00000261, 0.00000562],
    e: [0.01671123, -0.00004392],
    i: [-0.00001531, -0.01294668],
    L: [100.46457166, 35999.37244981],
    peri: [102.93768193, 0.32327364],
    node: [0, 0],
  },
  mars: {
    a: [1.52371034, 0.00001847],
    e: [0.0933941, 0.00007882],
    i: [1.84969142, -0.00813131],
    L: [-4.55343205, 19140.30268499],
    peri: [-23.94362959, 0.44441088],
    node: [49.55953891, -0.29257343],
  },
  jupiter: {
    a: [5.202887, -0.00011607],
    e: [0.04838624, -0.00013253],
    i: [1.30439695, -0.00183714],
    L: [34.39644051, 3034.74612775],
    peri: [14.72847983, 0.21252668],
    node: [100.47390909, 0.20469106],
  },
  pluto: {
    a: [39.48211675, -0.00031596],
    e: [0.2488273, 0.0000517],
    i: [17.14001206, 0.00004818],
    L: [238.92903833, 145.20780515],
    peri: [224.06891629, -0.04062942],
    node: [110.30393684, -0.01183482],
  },
};

interface MoonOrbit {
  parent: PlanetId;
  periodDays: number;
  /** Real orbit radius, AU. */
  radiusAu: number;
  /** Exaggerated orbit radius in scene units, so the moon is visible next to its parent. */
  sceneRadius: number;
  /** Ecliptic longitude as seen from the parent at J2000, deg. */
  lonAtJ2000: number;
}

export const MOON_ORBITS: Record<MoonId, MoonOrbit> = {
  moon: { parent: 'earth', periodDays: 27.321661, radiusAu: 0.00257, sceneRadius: 1.15, lonAtJ2000: 218.316 },
  europa: { parent: 'jupiter', periodDays: 3.551181, radiusAu: 0.004486, sceneRadius: 2.1, lonAtJ2000: 0 },
};

export const isMoon = (id: BodyId): id is MoonId => id === 'moon' || id === 'europa';

const centuriesSinceJ2000 = (tMs: number): number => (tMs - J2000_MS) / MS_PER_DAY / DAYS_PER_CENTURY;

/** Solve Kepler's equation E - e sin E = M for E (radians) by Newton iteration. */
export const solveKepler = (meanAnomaly: number, e: number): number => {
  // Wrap M to [-pi, pi] so the starting guess is close.
  const M = meanAnomaly - 2 * Math.PI * Math.round(meanAnomaly / (2 * Math.PI));
  let E = M + e * Math.sin(M);
  for (let n = 0; n < 12; n++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
};

interface ElementsAt {
  a: number;
  e: number;
  i: number;
  meanAnomaly: number;
  argPeri: number;
  node: number;
}

const elementsAt = (id: PlanetId, tMs: number): ElementsAt => {
  const T = centuriesSinceJ2000(tMs);
  const el = ELEMENTS[id];
  const at = (v: readonly [number, number]) => v[0] + v[1] * T;
  const peri = at(el.peri);
  const node = at(el.node);
  return {
    a: at(el.a),
    e: at(el.e),
    i: at(el.i) * DEG,
    meanAnomaly: (at(el.L) - peri) * DEG,
    argPeri: (peri - node) * DEG,
    node: node * DEG,
  };
};

/** Rotate a point in the orbital plane (x towards perihelion) into J2000 ecliptic coordinates. */
const orbitalToEcliptic = (xp: number, yp: number, el: ElementsAt): Vec3 => {
  const cw = Math.cos(el.argPeri);
  const sw = Math.sin(el.argPeri);
  const cO = Math.cos(el.node);
  const sO = Math.sin(el.node);
  const ci = Math.cos(el.i);
  const si = Math.sin(el.i);
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
};

const pointOnOrbit = (el: ElementsAt, E: number): Vec3 =>
  orbitalToEcliptic(el.a * (Math.cos(E) - el.e), el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E), el);

/** Heliocentric position of a planet in AU, J2000 ecliptic frame (z = north). */
export const planetPositionAu = (id: PlanetId, tMs: number): Vec3 => {
  const el = elementsAt(id, tMs);
  return pointOnOrbit(el, solveKepler(el.meanAnomaly, el.e));
};

const moonAngle = (id: MoonId, tMs: number): number => {
  const m = MOON_ORBITS[id];
  const days = (tMs - J2000_MS) / MS_PER_DAY;
  return m.lonAtJ2000 * DEG + (2 * Math.PI * days) / m.periodDays;
};

/** Heliocentric position of any body in AU, at true scale. */
export const bodyPositionAu = (id: BodyId, tMs: number): Vec3 => {
  if (!isMoon(id)) return planetPositionAu(id, tMs);
  const m = MOON_ORBITS[id];
  const p = planetPositionAu(m.parent, tMs);
  const a = moonAngle(id, tMs);
  return [p[0] + m.radiusAu * Math.cos(a), p[1] + m.radiusAu * Math.sin(a), p[2]];
};

/** Heliocentric ecliptic longitude in degrees, 0 to 360. */
export const eclipticLongitudeDeg = (p: Vec3): number => {
  const deg = Math.atan2(p[1], p[0]) / DEG;
  return (deg + 360) % 360;
};

export const length = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);

// --- Scene mapping -------------------------------------------------------

/** Scene radius of a 1 AU orbit. */
export const SCENE_UNITS_AT_1AU = 12;
/** Below 1, so outer orbits are pulled in. Pluto (~39 AU) lands near 52 units instead of 470. */
export const RADIUS_EXPONENT = 0.4;

/** Monotonic compression of heliocentric distance: AU in, scene units out. */
export const compressRadius = (rAu: number): number => SCENE_UNITS_AT_1AU * Math.pow(rAu, RADIUS_EXPONENT);

/**
 * Ecliptic AU to scene units. Direction is preserved, only distance is compressed.
 * Axes: scene y is ecliptic north, and ecliptic y maps to scene -z, so planets
 * still run counter-clockwise when seen from above (+y).
 */
const eclipticToScene = (p: Vec3): Vec3 => {
  const r = length(p);
  if (r === 0) return [0, 0, 0];
  const k = compressRadius(r) / r;
  return [p[0] * k, p[2] * k, -p[1] * k];
};

/** Offset of a moon from its parent in scene units (exaggerated radius, true angle). */
export const moonSceneOffset = (id: MoonId, tMs: number): Vec3 => {
  const m = MOON_ORBITS[id];
  const a = moonAngle(id, tMs);
  return [m.sceneRadius * Math.cos(a), 0, -m.sceneRadius * Math.sin(a)];
};

/** Position of any body in scene units. */
export const bodyScenePosition = (id: BodyId, tMs: number): Vec3 => {
  if (!isMoon(id)) return eclipticToScene(planetPositionAu(id, tMs));
  const p = eclipticToScene(planetPositionAu(MOON_ORBITS[id].parent, tMs));
  const o = moonSceneOffset(id, tMs);
  return [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
};

/** Closed loop of scene points tracing a planet's orbit, using its elements at tMs. */
export const planetOrbitScenePath = (id: PlanetId, tMs: number, segments = 256): Vec3[] => {
  const el = elementsAt(id, tMs);
  const points: Vec3[] = [];
  for (let n = 0; n <= segments; n++) {
    points.push(eclipticToScene(pointOnOrbit(el, (2 * Math.PI * n) / segments)));
  }
  return points;
};
