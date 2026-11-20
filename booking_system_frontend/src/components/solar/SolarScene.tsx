import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Stars, useCursor } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, Vector3 } from 'three';
import type { Group, MeshStandardMaterial } from 'three';
import { AVAILABILITY_COLOR, BODY_STYLE, DEFAULT_CAMERA_POSITION, SUN_COLOR, SUN_RADIUS } from '../../solar/bodyStyle';
import {
  arcPoint,
  arcPoints,
  availability,
  flightArc,
  flightPhase,
  flightProgress,
  shipPosition,
} from '../../solar/flights';
import type { MapFlight } from '../../solar/flights';
import { BODY_IDS, MOON_IDS, MOON_ORBITS, PLANET_IDS, bodyScenePosition, isMoon, planetOrbitScenePath } from '../../solar/orbits';
import type { BodyId, MoonId, PlanetId, Vec3 } from '../../solar/orbits';
import type { SimClock } from '../../solar/simClock';

type Tuple3 = [number, number, number];
const tuple = (p: Vec3): Tuple3 => [p[0], p[1], p[2]];

const FLY_SECONDS = 1.2;

const ClockTicker = ({ clock }: { clock: SimClock }) => {
  // Cap the step so a background tab does not jump the clock forward on return.
  useFrame((_, delta) => clock.tick(Math.min(delta, 0.1)));
  return null;
};

const makeGlowTexture = (): CanvasTexture => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 236, 170, 1)');
    gradient.addColorStop(0.2, 'rgba(253, 184, 19, 0.55)');
    gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.14)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
};

const Sun = () => {
  const glow = useMemo(() => makeGlowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
        <meshBasicMaterial color={SUN_COLOR} toneMapped={false} />
      </mesh>
      <sprite scale={[SUN_RADIUS * 7, SUN_RADIUS * 7, 1]}>
        <spriteMaterial map={glow} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* decay 0: sunlight does not fall off, since scene distances are compressed anyway. */}
      <pointLight intensity={2.6} decay={0} />
    </group>
  );
};

const PlanetOrbit = ({ id, tMs }: { id: PlanetId; tMs: number }) => {
  const points = useMemo(() => planetOrbitScenePath(id, tMs).map(tuple), [id, tMs]);
  return <Line points={points} color={BODY_STYLE[id].color} lineWidth={1} transparent opacity={0.28} />;
};

const CIRCLE: Tuple3[] = Array.from({ length: 97 }, (_, n) => {
  const a = (2 * Math.PI * n) / 96;
  return [Math.cos(a), 0, Math.sin(a)];
});

const MoonOrbit = ({ id, clock }: { id: MoonId; clock: SimClock }) => {
  const ref = useRef<Group>(null);
  const { parent, sceneRadius } = MOON_ORBITS[id];
  useFrame(() => {
    const p = bodyScenePosition(parent, clock.getState().timeMs);
    ref.current?.position.set(p[0], p[1], p[2]);
  });
  return (
    <group ref={ref} scale={sceneRadius}>
      <Line points={CIRCLE} color={BODY_STYLE[id].color} lineWidth={1} transparent opacity={0.22} />
    </group>
  );
};

interface BodyProps {
  id: BodyId;
  clock: SimClock;
  selected: boolean;
  onSelect: (id: BodyId) => void;
}

const Body = ({ id, clock, selected, onSelect }: BodyProps) => {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const { color, radius } = BODY_STYLE[id];

  useFrame(() => {
    const p = bodyScenePosition(id, clock.getState().timeMs);
    ref.current?.position.set(p[0], p[1], p[2]);
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.85} emissive={color} emissiveIntensity={hovered || selected ? 0.5 : 0.18} />
      </mesh>
      {/* Larger invisible sphere so small bodies are easy to click. */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[Math.max(radius * 1.3, 0.45), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.5, radius * 1.5 + 0.06, 64]} />
          <meshBasicMaterial color="#F9FAFB" transparent opacity={0.8} side={2} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

interface ShipProps {
  mapFlight: MapFlight;
  clock: SimClock;
  onBook: (mapFlight: MapFlight) => void;
  onHover: (flightId: number | null) => void;
}

const SHIP_UP: Tuple3 = [-Math.PI / 2, 0, 0];

const Ship = ({ mapFlight, clock, onBook, onHover }: ShipProps) => {
  const group = useRef<Group>(null);
  const hull = useRef<MeshStandardMaterial>(null);
  const line = useRef<ComponentRef<typeof Line>>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const arc = useMemo(() => flightArc(mapFlight), [mapFlight]);
  const points = useMemo(() => arcPoints(arc).map(tuple), [arc]);
  const { flight } = mapFlight;
  const color = AVAILABILITY_COLOR[availability(flight)];

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getState().timeMs;
    const phase = flightPhase(mapFlight, t);
    const p = shipPosition(mapFlight, arc, t);
    g.position.set(p[0], p[1], p[2]);

    if (phase === 'enroute') {
      const ahead = arcPoint(arc, Math.min(1, flightProgress(mapFlight, t) + 0.02));
      g.lookAt(ahead[0], ahead[1], ahead[2]);
    } else {
      g.rotation.set(SHIP_UP[0], SHIP_UP[1], SHIP_UP[2]);
    }

    // Keep ships readable when zoomed out, without letting them swamp a planet up close.
    const distance = state.camera.position.distanceTo(g.position);
    g.scale.setScalar(Math.min(3, Math.max(0.3, distance / 42)) * (hovered ? 1.3 : 1));

    if (hull.current) hull.current.opacity = phase === 'arrived' ? 0.45 : 1;
    if (line.current) line.current.material.opacity = phase === 'enroute' ? 0.9 : hovered ? 0.6 : 0.14;
  });

  return (
    <>
      <Line ref={line} points={points} color={color} lineWidth={1.5} transparent opacity={0.14} />
      <group ref={group}>
        {/* Cone points along +y by default; rotate it to +z so lookAt aims the nose. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.28, 0.95, 16]} />
          <meshStandardMaterial ref={hull} color={color} emissive={color} emissiveIntensity={0.9} transparent toneMapped={false} />
        </mesh>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onBook(mapFlight);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            onHover(flight.flight_id);
          }}
          onPointerOut={() => {
            setHovered(false);
            onHover(null);
          }}
        >
          <sphereGeometry args={[0.75, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
};

/** Label elements live in the DOM overlay; the scene only positions them. Keys: `body:<id>` and `ship`. */
export type LabelRegistry = RefObject<Map<string, HTMLElement>>;

const scratch = new Vector3();

interface LabelProjectorProps {
  clock: SimClock;
  labels: LabelRegistry;
  hoveredFlight: MapFlight | null;
}

/**
 * Projects bodies and the hovered ship to screen pixels and moves their DOM labels there.
 * Plain DOM writes each frame, so labels track the scene without re-rendering React.
 */
const LabelProjector = ({ clock, labels, hoveredFlight }: LabelProjectorProps) => {
  useFrame(({ camera, size }) => {
    const t = clock.getState().timeMs;
    const fov = 'fov' in camera ? camera.fov : 50;
    const place = (key: string, p: Vec3, worldOffset: number, pixelOffset: number) => {
      const el = labels.current.get(key);
      if (!el) return;
      scratch.set(p[0], p[1], p[2]);
      const distance = camera.position.distanceTo(scratch);
      scratch.project(camera);
      if (scratch.z < -1 || scratch.z > 1) {
        el.style.visibility = 'hidden';
        return;
      }
      const pixelsPerUnit = size.height / (2 * Math.tan((fov * Math.PI) / 360) * distance);
      const x = (scratch.x * 0.5 + 0.5) * size.width;
      const y = (-scratch.y * 0.5 + 0.5) * size.height + worldOffset * pixelsPerUnit + pixelOffset;
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };

    for (const id of BODY_IDS) {
      // Moon labels go above the moon, planet labels below, so a moon and its parent do not collide.
      const side = isMoon(id) ? -1 : 1;
      place(`body:${id}`, bodyScenePosition(id, t), side * BODY_STYLE[id].radius, isMoon(id) ? -18 : 4);
    }
    if (hoveredFlight) place('ship', shipPosition(hoveredFlight, flightArc(hoveredFlight), t), 0, -20);
  });
  return null;
};

interface CameraRigProps {
  clock: SimClock;
  focus: BodyId | null;
}

/**
 * Flies the camera to the focused body, then follows it as it moves.
 * With no focus it flies back to the default view of the inner system.
 */
const CameraRig = ({ clock, focus }: CameraRigProps) => {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const fly = useRef<{ t: number; fromTarget: Vector3; fromOffset: Vector3; toOffset: Vector3 } | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const c = controls.current;
    // No fly-in on first mount: the camera already starts at the default view.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!c) return;
    const fromOffset = c.object.position.clone().sub(c.target);
    const toOffset = focus
      ? fromOffset.clone().normalize().multiplyScalar(BODY_STYLE[focus].radius * 6 + 7)
      : new Vector3(...DEFAULT_CAMERA_POSITION);
    fly.current = { t: 0, fromTarget: c.target.clone(), fromOffset, toOffset };
  }, [focus]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const goal = focus ? bodyScenePosition(focus, clock.getState().timeMs) : ([0, 0, 0] as const);
    const f = fly.current;
    if (f) {
      f.t = Math.min(1, f.t + delta / FLY_SECONDS);
      const ease = f.t * f.t * (3 - 2 * f.t);
      c.target.set(goal[0], goal[1], goal[2]).sub(f.fromTarget).multiplyScalar(ease).add(f.fromTarget);
      c.object.position.copy(f.fromOffset).lerp(f.toOffset, ease).add(c.target);
      c.enabled = f.t >= 1;
      if (f.t >= 1) fly.current = null;
    } else if (focus) {
      // Follow: move camera and target together so the user's own orbit and zoom are kept.
      const dx = goal[0] - c.target.x;
      const dy = goal[1] - c.target.y;
      const dz = goal[2] - c.target.z;
      c.target.set(goal[0], goal[1], goal[2]);
      c.object.position.set(c.object.position.x + dx, c.object.position.y + dy, c.object.position.z + dz);
    }
    c.update();
  });

  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={3} maxDistance={220} />;
};

export interface SolarSceneProps {
  clock: SimClock;
  mapFlights: MapFlight[];
  selectedBody: BodyId | null;
  onSelectBody: (id: BodyId) => void;
  onBookFlight: (mapFlight: MapFlight) => void;
  labels: LabelRegistry;
  hoveredFlight: MapFlight | null;
  onHoverFlight: (flightId: number | null) => void;
}

export const SolarScene = ({
  clock,
  mapFlights,
  selectedBody,
  onSelectBody,
  onBookFlight,
  labels,
  hoveredFlight,
  onHoverFlight,
}: SolarSceneProps) => {
  // Orbit shapes barely change over the flight window, so trace them once.
  const [orbitEpochMs] = useState(() => clock.getState().timeMs);

  return (
    <>
      <color attach="background" args={['#030712']} />
      <ambientLight intensity={0.35} />
      <Stars radius={320} depth={60} count={5000} factor={6} saturation={0} fade speed={0.4} />
      <ClockTicker clock={clock} />
      <Sun />
      {PLANET_IDS.map((id) => (
        <PlanetOrbit key={id} id={id} tMs={orbitEpochMs} />
      ))}
      {MOON_IDS.map((id) => (
        <MoonOrbit key={id} id={id} clock={clock} />
      ))}
      {BODY_IDS.map((id) => (
        <Body key={id} id={id} clock={clock} selected={selectedBody === id} onSelect={onSelectBody} />
      ))}
      {mapFlights.map((mf) => (
        <Ship key={mf.flight.flight_id} mapFlight={mf} clock={clock} onBook={onBookFlight} onHover={onHoverFlight} />
      ))}
      <CameraRig clock={clock} focus={selectedBody} />
      {/* After the rig, so labels use this frame's camera. */}
      <LabelProjector clock={clock} labels={labels} hoveredFlight={hoveredFlight} />
    </>
  );
};
