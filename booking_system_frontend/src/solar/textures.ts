/**
 * Procedural surface maps for the solar map, painted to a canvas at load time.
 * No image assets and no three.js here: each function returns an equirectangular canvas.
 * The surfaces are impressions, not maps. Continents, bands and craters are noise.
 */
import type { BodyId } from './orbits';

type Rgb = readonly [number, number, number];

const hex = (value: string): Rgb => {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: Rgb, b: Rgb, t: number): Rgb => {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const smooth = (lo: number, hi: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

const hash = (x: number, y: number, z: number, seed: number): number => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Smooth 3D value noise, 0..1. Sampling it on a sphere gives maps with no seam and no pinched poles. */
const noise = (x: number, y: number, z: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const corner = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(corner(0, 0, 0), corner(1, 0, 0), u), lerp(corner(0, 1, 0), corner(1, 1, 0), u), v),
    lerp(lerp(corner(0, 0, 1), corner(1, 0, 1), u), lerp(corner(0, 1, 1), corner(1, 1, 1), u), v),
    w,
  );
};

/** Fractal noise, 0..1. */
const fbm = (x: number, y: number, z: number, octaves: number, seed: number): number => {
  let sum = 0;
  let amplitude = 0.5;
  let total = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise(x * f, y * f, z * f, seed + o);
    total += amplitude;
    amplitude *= 0.5;
    f *= 2.03;
  }
  return sum / total;
};

interface Sample {
  /** Unit vector on the sphere. */
  x: number;
  y: number;
  z: number;
  /** Radians: latitude -pi/2..pi/2, longitude 0..2pi. */
  lat: number;
  lon: number;
}

type Painter = (s: Sample) => Rgb;

const paint = (width: number, height: number, painter: Painter): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const image = ctx.createImageData(width, height);
  for (let py = 0; py < height; py++) {
    const lat = (0.5 - (py + 0.5) / height) * Math.PI;
    const cosLat = Math.cos(lat);
    const y = Math.sin(lat);
    for (let px = 0; px < width; px++) {
      const lon = ((px + 0.5) / width) * 2 * Math.PI;
      const c = painter({ x: cosLat * Math.cos(lon), y, z: cosLat * Math.sin(lon), lat, lon });
      const i = (py * width + px) * 4;
      image.data[i] = c[0];
      image.data[i + 1] = c[1];
      image.data[i + 2] = c[2];
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
};

const WHITE: Rgb = [255, 255, 255];

const earth: Painter = ({ x, y, z, lat }) => {
  const height = fbm(x * 1.9 + 3, y * 1.9, z * 1.9, 5, 11);
  const detail = fbm(x * 7, y * 7, z * 7, 3, 23);
  let c: Rgb;
  if (height > 0.53) {
    const dry = smooth(0.35, 0.7, detail) * (1 - smooth(0.2, 0.9, Math.abs(lat)));
    c = mix(mix(hex('#2f6b3a'), hex('#5d8a45'), detail), hex('#b79a62'), dry);
    c = mix(c, hex('#6f6a5c'), smooth(0.66, 0.78, height));
  } else {
    c = mix(hex('#0a2a66'), hex('#1f6fb5'), smooth(0.3, 0.53, height));
  }
  const ice = smooth(1.12, 1.3, Math.abs(lat) + (detail - 0.5) * 0.35);
  c = mix(c, hex('#eef4fa'), ice);
  const cloud = fbm(x * 3.2 + 9, y * 4.4, z * 3.2, 5, 37);
  return mix(c, WHITE, smooth(0.54, 0.72, cloud) * 0.85);
};

const mars: Painter = ({ x, y, z, lat }) => {
  const base = fbm(x * 2.4, y * 2.4, z * 2.4, 5, 51);
  const detail = fbm(x * 9, y * 9, z * 9, 3, 59);
  let c = mix(hex('#8a3a1e'), hex('#d98452'), base);
  c = mix(c, hex('#4f2315'), smooth(0.56, 0.7, fbm(x * 1.4 + 5, y * 1.4, z * 1.4, 4, 67)) * 0.7);
  c = scale(c, 0.85 + detail * 0.3);
  return mix(c, hex('#f3ece6'), smooth(1.25, 1.4, Math.abs(lat) + (detail - 0.5) * 0.3));
};

const venus: Painter = ({ x, y, z, lat }) => {
  const swirl = fbm(x * 1.6, y * 3.5, z * 1.6, 5, 71);
  const band = 0.5 + 0.5 * Math.sin(lat * 7 + swirl * 6);
  return mix(hex('#b98a45'), hex('#f3e2b3'), band * 0.6 + swirl * 0.5);
};

const jupiter: Painter = ({ x, y, z, lat, lon }) => {
  const turbulence = fbm(x * 2.2, y * 9, z * 2.2, 5, 83);
  const band = 0.5 + 0.5 * Math.sin(lat * 15 + (turbulence - 0.5) * 3.2);
  let c = mix(hex('#9c6a45'), hex('#ead9bb'), smooth(0.2, 0.8, band));
  c = mix(c, hex('#c08a5c'), fbm(x * 6, y * 22, z * 6, 3, 89) * 0.45);
  // Great Red Spot: an ellipse in the southern hemisphere.
  const dLon = ((lon - 4.2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const spot = Math.exp(-((dLon / 0.26) ** 2 + ((lat + 0.38) / 0.11) ** 2));
  return mix(c, hex('#b4472b'), spot * 0.9);
};

const pluto: Painter = ({ x, y, z, lat, lon }) => {
  const base = fbm(x * 2.6, y * 2.6, z * 2.6, 5, 97);
  let c = mix(hex('#5d4a40'), hex('#cdb9a5'), base);
  // Pale nitrogen-ice plain, loosely after Tombaugh Regio.
  const dLon = ((lon - 3 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const plain = Math.exp(-((dLon / 0.6) ** 2 + ((lat - 0.2) / 0.42) ** 2));
  c = mix(c, hex('#f1e7da'), smooth(0.25, 0.7, plain + (base - 0.5) * 0.4));
  return c;
};

const moon: Painter = ({ x, y, z }) => {
  const maria = fbm(x * 1.6 + 2, y * 1.6, z * 1.6, 4, 101);
  const detail = fbm(x * 12, y * 12, z * 12, 4, 109);
  const c = mix(hex('#5c5e63'), hex('#c9cbd0'), smooth(0.38, 0.6, maria));
  return scale(c, 0.78 + detail * 0.45);
};

const europa: Painter = ({ x, y, z }) => {
  const base = fbm(x * 2, y * 2, z * 2, 4, 113);
  let c = mix(hex('#bfb8a4'), hex('#f2efe6'), base);
  // Lineae: thin reddish cracks along the ridges of two noise fields.
  const ridge = (n: number) => 1 - Math.abs(2 * n - 1);
  const crack = Math.max(ridge(fbm(x * 3.1, y * 3.1, z * 3.1, 3, 127)), ridge(fbm(x * 4.7 + 4, y * 4.7, z * 4.7, 3, 131)));
  c = mix(c, hex('#8c4a30'), smooth(0.93, 0.99, crack) * 0.85);
  return c;
};

const PAINTERS: Record<BodyId, Painter> = { earth, mars, venus, jupiter, pluto, moon, europa };

export const paintBody = (id: BodyId): HTMLCanvasElement => paint(512, 256, PAINTERS[id]);

export const paintSun = (): HTMLCanvasElement =>
  paint(256, 128, ({ x, y, z }) => {
    const cells = fbm(x * 5, y * 5, z * 5, 4, 139);
    return mix(hex('#ff7a00'), hex('#fff3b8'), smooth(0.3, 0.75, cells));
  });

/** Dim backdrop: a faint band of milky light plus nebula colour from the site palette. */
export const paintBackdrop = (): HTMLCanvasElement =>
  paint(1024, 512, ({ x, y, z }) => {
    const cloud = fbm(x * 1.7, y * 1.7, z * 1.7, 4, 149);
    const hue = fbm(x * 0.9 + 7, y * 0.9, z * 0.9, 2, 157);
    // Band along a tilted great circle.
    const d = x * 0.28 + y * 0.9 + z * 0.33;
    const band = Math.exp(-((d / 0.3) ** 2));
    const nebula = mix(hex('#6366F1'), hex('#EC4899'), smooth(0.4, 0.65, hue));
    const glow = smooth(0.42, 0.8, cloud) * (0.14 + band * 0.3);
    const milky = band * smooth(0.35, 0.75, cloud) * 0.14;
    const base = hex('#030712');
    // A little random dither hides the 8-bit banding that dark gradients show.
    const dither = (Math.random() - 0.5) * 2.5;
    return [
      base[0] + nebula[0] * glow + 190 * milky + dither,
      base[1] + nebula[1] * glow + 200 * milky + dither,
      base[2] + nebula[2] * glow + 255 * milky + dither,
    ];
  });

/** Soft radial falloff, white on transparent. Tinted by the sprite material. */
export const paintGlow = (): HTMLCanvasElement => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // A tight core plus a wide, faint skirt that reaches zero well inside the edge.
    for (let n = 0; n <= 24; n++) {
      const r = n / 24;
      const a = 0.85 * Math.exp(-r * r * 30) + 0.15 * Math.exp(-r * r * 6) * Math.max(0, 1 - r * 1.15);
      g.addColorStop(r, `rgba(255,255,255,${a.toFixed(4)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
};
