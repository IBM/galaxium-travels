import { describe, expect, it } from 'vitest';
import {
  BODY_IDS,
  MOON_ORBITS,
  PLANET_IDS,
  bodyPositionAu,
  bodyScenePosition,
  compressRadius,
  eclipticLongitudeDeg,
  length,
  planetOrbitScenePath,
  planetPositionAu,
  solveKepler,
} from './orbits';
import type { Vec3 } from './orbits';

const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const JAN_2099 = Date.UTC(2099, 0, 5);

describe('solveKepler', () => {
  it('satisfies E - e sin E = M', () => {
    for (const e of [0, 0.0167, 0.0934, 0.2488]) {
      for (const M of [-3, -1, 0, 0.5, 2, 3.1]) {
        const E = solveKepler(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
      }
    }
  });
});

describe('planet positions', () => {
  it('keeps Earth at about 1 AU all year', () => {
    for (let month = 0; month < 12; month++) {
      const r = length(planetPositionAu('earth', Date.UTC(2099, month, 1)));
      expect(r).toBeGreaterThan(0.98);
      expect(r).toBeLessThan(1.02);
    }
  });

  it('keeps every planet between its perihelion and aphelion', () => {
    const bounds = { venus: [0.71, 0.73], earth: [0.98, 1.02], mars: [1.38, 1.67], jupiter: [4.9, 5.5], pluto: [29.5, 49.5] };
    for (const id of PLANET_IDS) {
      const r = length(planetPositionAu(id, JAN_2099));
      expect(r).toBeGreaterThan(bounds[id][0]);
      expect(r).toBeLessThan(bounds[id][1]);
    }
  });

  // At the March equinox the Sun is at geocentric longitude 0, so Earth is at heliocentric 180.
  it('puts Earth at heliocentric longitude 180 at the March 2000 equinox', () => {
    const lon = eclipticLongitudeDeg(planetPositionAu('earth', Date.UTC(2000, 2, 20, 7, 35)));
    expect(angleDiff(lon, 180)).toBeLessThan(1);
  });

  // At opposition the Sun, Earth and the planet line up, so heliocentric longitudes match.
  it('lines up Earth and Mars at the 28 Aug 2003 opposition', () => {
    const t = Date.UTC(2003, 7, 28, 18);
    const earth = eclipticLongitudeDeg(planetPositionAu('earth', t));
    const mars = eclipticLongitudeDeg(planetPositionAu('mars', t));
    expect(angleDiff(earth, mars)).toBeLessThan(1.5);
  });

  it('lines up Earth and Jupiter at the 21 Sep 2010 opposition', () => {
    const t = Date.UTC(2010, 8, 21, 12);
    const earth = eclipticLongitudeDeg(planetPositionAu('earth', t));
    const jupiter = eclipticLongitudeDeg(planetPositionAu('jupiter', t));
    expect(angleDiff(earth, jupiter)).toBeLessThan(1.5);
  });

  it('puts Venus between Earth and the Sun at the 8 Jun 2004 transit', () => {
    const t = Date.UTC(2004, 5, 8, 8);
    const earth = eclipticLongitudeDeg(planetPositionAu('earth', t));
    const venus = eclipticLongitudeDeg(planetPositionAu('venus', t));
    expect(angleDiff(earth, venus)).toBeLessThan(1.5);
  });
});

describe('moons', () => {
  it('keeps the Moon and Europa at their real distance from the parent', () => {
    for (const id of ['moon', 'europa'] as const) {
      const m = MOON_ORBITS[id];
      for (let day = 0; day < 30; day += 3) {
        const t = JAN_2099 + day * 86_400_000;
        expect(dist(bodyPositionAu(id, t), planetPositionAu(m.parent, t))).toBeCloseTo(m.radiusAu, 6);
      }
    }
  });

  it('returns the Moon to the same side of Earth after one sidereal month', () => {
    const offset = (t: number): Vec3 => {
      const m = bodyPositionAu('moon', t);
      const e = planetPositionAu('earth', t);
      return [m[0] - e[0], m[1] - e[1], m[2] - e[2]];
    };
    const a = eclipticLongitudeDeg(offset(JAN_2099));
    const b = eclipticLongitudeDeg(offset(JAN_2099 + 27.321661 * 86_400_000));
    expect(angleDiff(a, b)).toBeLessThan(0.01);
  });
});

describe('scene mapping', () => {
  it('compresses radius monotonically', () => {
    let previous = -1;
    for (let r = 0; r <= 50; r += 0.25) {
      const scene = compressRadius(r);
      expect(scene).toBeGreaterThan(previous);
      previous = scene;
    }
    expect(compressRadius(39.5) / compressRadius(1)).toBeLessThan(6);
  });

  it('keeps angles true for planets', () => {
    for (const id of PLANET_IDS) {
      const au = planetPositionAu(id, JAN_2099);
      const s = bodyScenePosition(id, JAN_2099);
      // Scene axes: [x, north, -y].
      expect(angleDiff(eclipticLongitudeDeg(au), eclipticLongitudeDeg([s[0], -s[2], s[1]]))).toBeLessThan(1e-6);
      expect(length(s)).toBeCloseTo(compressRadius(length(au)), 6);
    }
  });

  it('keeps moons at their exaggerated scene radius from the parent', () => {
    for (const id of ['moon', 'europa'] as const) {
      const m = MOON_ORBITS[id];
      expect(dist(bodyScenePosition(id, JAN_2099), bodyScenePosition(m.parent, JAN_2099))).toBeCloseTo(m.sceneRadius, 6);
    }
  });

  it('keeps scene orbits in order and well separated', () => {
    const radii = PLANET_IDS.map((id) => length(bodyScenePosition(id, JAN_2099)));
    for (let n = 1; n < radii.length; n++) expect(radii[n] - radii[n - 1]).toBeGreaterThan(1);
  });

  it('traces an orbit path that passes through the planet', () => {
    for (const id of PLANET_IDS) {
      const path = planetOrbitScenePath(id, JAN_2099, 720);
      const p = bodyScenePosition(id, JAN_2099);
      const nearest = Math.min(...path.map((q) => dist(p, q)));
      expect(nearest).toBeLessThan(0.3);
      expect(dist(path[0], path[path.length - 1])).toBeLessThan(1e-6);
    }
  });

  it('returns finite positions for every body', () => {
    for (const id of BODY_IDS) {
      for (const v of bodyScenePosition(id, JAN_2099)) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
