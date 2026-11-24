/**
 * Flat planet images for the pages around the map: the same procedural surfaces
 * as the 3D scene, drawn once per body as a lit sphere on a small canvas.
 * No three.js here, so pages that never open the map do not load it.
 */
import { BODY_STYLE } from './bodyStyle';
import type { BodyId } from './orbits';
import { sampleBody } from './textures';

/** Canvas pixels. Images are shown at up to ~96 CSS px, so this stays sharp on 2x screens. */
const SIZE = 192;

/** Light from the upper left, towards the viewer. */
const LIGHT = (() => {
  const v = [-0.52, 0.5, 0.69];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n] as const;
})();

/** Longitude facing the viewer, radians. Chosen so each body shows its recognisable side. */
const FACING: Partial<Record<BodyId, number>> = { earth: 0.6, jupiter: 4.0, pluto: 2.8 };

const rgb = (hexColor: string) => {
  const n = parseInt(hexColor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

const cache = new Map<BodyId, string>();

/** PNG data URL of the body as a lit sphere on a transparent background. Painted once, then cached. */
export const orbImage = (id: BodyId): string => {
  const cached = cache.get(id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const image = ctx.createImageData(SIZE, SIZE);
  const facing = FACING[id] ?? 0;
  const atmosphere = BODY_STYLE[id].atmosphere;
  const rim = atmosphere ? rgb(atmosphere) : null;
  const half = SIZE / 2;

  for (let py = 0; py < SIZE; py++) {
    const v = (py + 0.5) / half - 1;
    for (let px = 0; px < SIZE; px++) {
      const u = (px + 0.5) / half - 1;
      const r = Math.hypot(u, v);
      if (r >= 1) continue;

      // Point on the sphere under this pixel, in view space: x right, y up, z towards the viewer.
      const z = Math.sqrt(1 - r * r);
      const y = -v;
      const lat = Math.asin(y);
      const lon = (facing + Math.atan2(u, z) + Math.PI * 2) % (Math.PI * 2);
      const cosLat = Math.cos(lat);
      const c = sampleBody(id, { x: cosLat * Math.cos(lon), y, z: cosLat * Math.sin(lon), lat, lon });

      const diffuse = Math.max(0, u * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);
      const shade = 0.04 + 0.96 * diffuse;
      // Atmosphere: a thin glow at the limb, on the lit side only.
      const haze = rim ? Math.pow(1 - z, 2.5) * 0.75 * diffuse : 0;

      const i = (py * SIZE + px) * 4;
      image.data[i] = c[0] * shade + (rim ? rim[0] * haze : 0);
      image.data[i + 1] = c[1] * shade + (rim ? rim[1] * haze : 0);
      image.data[i + 2] = c[2] * shade + (rim ? rim[2] * haze : 0);
      // One pixel of fall-off at the edge instead of a hard, jagged circle.
      image.data[i + 3] = 255 * Math.min(1, (1 - r) * half);
    }
  }

  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
};
