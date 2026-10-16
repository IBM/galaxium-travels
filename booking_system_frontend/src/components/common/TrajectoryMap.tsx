/**
 * TrajectoryMap — animated miniature SVG solar-system diagram.
 *
 * Animations (all pure SVG/SMIL — no JS timers):
 *  • Arc draws on via strokeDashoffset (3 s, ease-in-out, repeats)
 *  • A small spacecraft dot travels along the arc via <animateMotion>
 *  • Origin / destination halos pulse in opacity
 *  • Sun corona pulses in scale
 */

interface BodyDef {
  orbitR: number;
  color: string;
  dotR: number;
  angleDeg: number;
}

const BODIES: Record<string, BodyDef> = {
  earth:   { orbitR: 30, color: '#3b82f6', dotR: 4,   angleDeg: 60  },
  moon:    { orbitR: 30, color: '#9ca3af', dotR: 2.5,  angleDeg: 80  },
  venus:   { orbitR: 22, color: '#f59e0b', dotR: 3.5,  angleDeg: 130 },
  mars:    { orbitR: 42, color: '#ef4444', dotR: 3.5,  angleDeg: 200 },
  jupiter: { orbitR: 62, color: '#d97706', dotR: 6,    angleDeg: 300 },
  europa:  { orbitR: 62, color: '#06b6d4', dotR: 2.5,  angleDeg: 320 },
  pluto:   { orbitR: 88, color: '#a78bfa', dotR: 2.5,  angleDeg: 250 },
};

const SUN_R = 6;
const CX = 100;
const CY = 100;

function toXY(orbitR: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + orbitR * Math.cos(rad), y: CY - orbitR * Math.sin(rad) };
}

/** Rough arc-length estimate for a quadratic bezier (de Casteljau subdivision). */
function bezierLength(
  p1x: number, p1y: number,
  cpx: number, cpy: number,
  p2x: number, p2y: number,
  steps = 50,
): number {
  let len = 0;
  let px = p1x, py = p1y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const nx = mt * mt * p1x + 2 * mt * t * cpx + t * t * p2x;
    const ny = mt * mt * p1y + 2 * mt * t * cpy + t * t * p2y;
    const dx = nx - px, dy = ny - py;
    len += Math.sqrt(dx * dx + dy * dy);
    px = nx; py = ny;
  }
  return len;
}

interface TrajectoryMapProps {
  origin: string;
  destination: string;
  size?: number;
  className?: string;
}

export const TrajectoryMap = ({ origin, destination, size = 200, className = '' }: TrajectoryMapProps) => {
  const originKey = origin.toLowerCase();
  const destKey   = destination.toLowerCase();

  const originBody = BODIES[originKey];
  const destBody   = BODIES[destKey];

  // Deduplicated orbit radii, ascending
  const orbitRings = [...new Set(Object.values(BODIES).map((d) => d.orbitR))].sort((a, b) => a - b);

  // Transfer arc geometry
  let arcPath: string | null = null;
  let arcLen  = 0;

  if (originBody && destBody) {
    const p1 = toXY(originBody.orbitR, originBody.angleDeg);
    const p2 = toXY(destBody.orbitR,   destBody.angleDeg);
    const mx  = (p1.x + p2.x) / 2;
    const my  = (p1.y + p2.y) / 2;
    const dx  = mx - CX;
    const dy  = my - CY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const cpx = mx + (dx / len) * 15;
    const cpy = my + (dy / len) * 15;
    arcPath = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Q ${cpx.toFixed(2)} ${cpy.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    arcLen  = bezierLength(p1.x, p1.y, cpx, cpy, p2.x, p2.y);
  }

  // Animation duration for the draw-on arc and spacecraft
  const drawDur = '2.8s';

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-label={`Trajectory from ${origin} to ${destination}`}
    >
      {/* ── Background ── */}
      <circle cx={CX} cy={CY} r={98} fill="#030712" stroke="#1e293b" strokeWidth="1" />

      {/* ── Orbit rings ── */}
      {orbitRings.map((r) => (
        <circle
          key={r}
          cx={CX} cy={CY} r={r}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="0.7"
          strokeDasharray="3 3"
        />
      ))}

      {/* ── Sun + pulsing corona ── */}
      <circle cx={CX} cy={CY} r={SUN_R} fill="#fbbf24" />
      <circle cx={CX} cy={CY} r={SUN_R + 3.5} fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.3">
        <animate attributeName="r"    values={`${SUN_R + 2};${SUN_R + 5};${SUN_R + 2}`} dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.08;0.3"                           dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* ── Planet dots ── */}
      {Object.entries(BODIES).map(([name, def]) => {
        const { x, y }  = toXY(def.orbitR, def.angleDeg);
        const isOrigin  = name === originKey;
        const isDest    = name === destKey;
        const highlight = isOrigin || isDest;
        return (
          <g key={name}>
            <circle cx={x} cy={y} r={def.dotR} fill={def.color} opacity={highlight ? 1 : 0.4} />
            {highlight && (
              <circle cx={x} cy={y} r={def.dotR + 3} fill="none" stroke={def.color} strokeWidth="0.9" opacity="0.5">
                <animate attributeName="r"       values={`${def.dotR + 2};${def.dotR + 5};${def.dotR + 2}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.1;0.5"                                        dur="2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* ── Transfer arc with draw-on animation ── */}
      {arcPath && arcLen > 0 && (
        <>
          {/* Static dim under-line so the gap between loops isn't jarring */}
          <path
            d={arcPath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="0.6"
            strokeDasharray="2 4"
            opacity="0.25"
          />

          {/* Animated draw-on stroke */}
          <path
            d={arcPath}
            fill="none"
            stroke="#818cf8"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${arcLen}`}
            strokeDashoffset={arcLen}
            opacity="0.95"
          >
            {/* Draw on */}
            <animate
              attributeName="strokeDashoffset"
              from={arcLen}
              to={0}
              dur={drawDur}
              begin="0s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.4 0 0.2 1"
            />
          </path>

          {/* ── Spacecraft dot travelling along the arc ── */}
          <circle r="2.2" fill="#e0e7ff">
            <animateMotion
              path={arcPath}
              dur={drawDur}
              begin="0s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.4 0 0.2 1"
              rotate="auto"
            />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.9;1" dur={drawDur} repeatCount="indefinite" />
          </circle>

          {/* Subtle thruster glow trailing the spacecraft */}
          <circle r="1" fill="#6366f1" opacity="0.7">
            <animateMotion
              path={arcPath}
              dur={drawDur}
              begin="0.06s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.4 0 0.2 1"
              rotate="auto"
            />
            <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.05;0.88;1" dur={drawDur} repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* ── Labels ── */}
      {originBody && (() => {
        const { x, y } = toXY(originBody.orbitR, originBody.angleDeg);
        return (
          <text x={x} y={y - originBody.dotR - 3.5} textAnchor="middle" fontSize="6" fill="#93c5fd" opacity="0.9">
            {origin}
          </text>
        );
      })()}
      {destBody && (() => {
        const { x, y } = toXY(destBody.orbitR, destBody.angleDeg);
        return (
          <text x={x} y={y - destBody.dotR - 3.5} textAnchor="middle" fontSize="6" fill="#c4b5fd" opacity="0.9">
            {destination}
          </text>
        );
      })()}
    </svg>
  );
};

// Made with Bob
