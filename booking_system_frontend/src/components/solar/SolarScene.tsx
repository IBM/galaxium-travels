import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, Stars, useCursor } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Group, Mesh, PerspectiveCamera, SpriteMaterial } from 'three';
import {
  AVAILABILITY_COLOR,
  BODY_STYLE,
  DEFAULT_CAMERA_POSITION,
  INTRO_CAMERA_POSITION,
  SUN_RADIUS,
} from '../../solar/bodyStyle';
import {
  arcPoint,
  arcPoints,
  availability,
  flightArc,
  flightPhase,
  flightProgress,
  paceAt,
  shipPosition,
} from '../../solar/flights';
import type { MapFlight } from '../../solar/flights';
import { BODY_IDS, MOON_IDS, MOON_ORBITS, PLANET_IDS, bodyScenePosition, isMoon, planetOrbitScenePath } from '../../solar/orbits';
import type { BodyId, MoonId, PlanetId, Vec3 } from '../../solar/orbits';
import type { SimClock } from '../../solar/simClock';
import { paintBackdrop, paintBody, paintGlow, paintSun } from '../../solar/textures';

type Tuple3 = [number, number, number];
const tuple = (p: Vec3): Tuple3 => [p[0], p[1], p[2]];

/** Canvas painted once, uploaded as an sRGB texture, disposed with the component. */
const useCanvasTexture = (paint: () => HTMLCanvasElement): CanvasTexture => {
  const [texture] = useState(() => {
    const t = new CanvasTexture(paint());
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
};

/** Colour pushed past 1.0 so the bloom pass picks it up. */
const hdr = (color: string, gain: number): Color => new Color(color).multiplyScalar(gain);

interface ClockDriverProps {
  clock: SimClock;
  mapFlights: MapFlight[];
}

/**
 * Advances the clock each frame. Playback slows around flights and skips through the
 * gaps between them, and loops when it reaches the end.
 */
const ClockDriver = ({ clock, mapFlights }: ClockDriverProps) => {
  useFrame((_, delta) => {
    const state = clock.getState();
    if (!state.playing) {
      // Stopped at the end (not paused by the user): start over.
      if (state.timeMs >= state.endMs && state.endMs > state.startMs) clock.setPlaying(true);
      return;
    }
    // Cap the step so a background tab does not jump the clock forward on return.
    const dt = Math.min(delta, 0.1);
    clock.tick((dt * paceAt(mapFlights, state.timeMs)) / state.speed);
  });
  return null;
};

const Backdrop = () => {
  const texture = useCanvasTexture(paintBackdrop);
  return (
    <>
      <mesh scale={900}>
        <sphereGeometry args={[1, 48, 24]} />
        <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <Stars radius={300} depth={80} count={6000} factor={5} saturation={0.2} fade speed={0.3} />
    </>
  );
};

const Sun = ({ glow }: { glow: CanvasTexture }) => {
  const surface = useCanvasTexture(paintSun);
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.04;
  });
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
        <meshBasicMaterial map={surface} color={[2.6, 2.1, 1.5]} toneMapped={false} />
      </mesh>
      <sprite scale={[SUN_RADIUS * 11, SUN_RADIUS * 11, 1]}>
        <spriteMaterial map={glow} color="#FFB347" blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* decay 0: sunlight does not fall off, since scene distances are compressed anyway. */}
      <pointLight intensity={3.2} decay={0} color="#FFF4E0" />
    </group>
  );
};

const ORBIT_TINT = new Color('#9DB2FF');

/**
 * Orbit line that is brightest just behind the planet and fades around the loop,
 * so it reads as a path being travelled rather than a ring.
 */
const PlanetOrbit = ({ id, tMs }: { id: PlanetId; tMs: number }) => {
  const { points, colors } = useMemo(() => {
    const path = planetOrbitScenePath(id, tMs, 360);
    const here = bodyScenePosition(id, tMs);
    let nearest = 0;
    let best = Infinity;
    path.forEach((p, n) => {
      const d = Math.hypot(p[0] - here[0], p[1] - here[1], p[2] - here[2]);
      if (d < best) {
        best = d;
        nearest = n;
      }
    });
    const count = path.length - 1;
    const tint = new Color(BODY_STYLE[id].color).lerp(ORBIT_TINT, 0.55);
    return {
      points: path.map(tuple),
      colors: path.map((_, n): Tuple3 => {
        // Path points run in the direction of travel, so lower indices are behind the planet.
        const behind = ((nearest - n + count) % count) / count;
        const b = 0.07 + 0.5 * Math.exp(-behind * 5);
        return [tint.r * b, tint.g * b, tint.b * b];
      }),
    };
  }, [id, tMs]);
  return <Line points={points} vertexColors={colors} lineWidth={1.1} transparent blending={AdditiveBlending} depthWrite={false} />;
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
      <Line points={CIRCLE} color="#9DB2FF" lineWidth={1} transparent opacity={0.16} depthWrite={false} />
    </group>
  );
};

// Rim glow drawn on the inside of a slightly larger shell: strongest at the planet's
// limb, fading to nothing at the shell's own edge, and dimmer on the night side.
const ATMOSPHERE_SCALE = 1.22;
const ATMOSPHERE_VERTEX = /* glsl */ `
  varying float vRim;
  varying float vSun;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vRim = -dot(n, normalize(-viewPosition.xyz));
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    // The sun sits at the origin.
    vSun = dot(worldNormal, normalize(-worldPosition));
    gl_Position = projectionMatrix * viewPosition;
  }
`;
const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uLimb;
  varying float vRim;
  varying float vSun;
  void main() {
    float rim = pow(clamp(vRim / uLimb, 0.0, 1.0), 3.0);
    float lit = 0.25 + 0.75 * smoothstep(-0.35, 0.55, vSun);
    gl_FragColor = vec4(uColor * rim * lit * 1.6, rim * lit);
  }
`;

const Atmosphere = ({ color, radius }: { color: string; radius: number }) => {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      // |normal . view| of the shell's back face where it meets the planet's silhouette.
      uLimb: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_SCALE * ATMOSPHERE_SCALE)) },
    }),
    [color],
  );
  return (
    <mesh scale={radius * ATMOSPHERE_SCALE}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX}
        fragmentShader={ATMOSPHERE_FRAGMENT}
        uniforms={uniforms}
        side={BackSide}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

interface BodyProps {
  id: BodyId;
  clock: SimClock;
  onSelect: (id: BodyId) => void;
}

const Body = ({ id, clock, onSelect }: BodyProps) => {
  const ref = useRef<Group>(null);
  const surface = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const { radius, tilt, spin, atmosphere } = BODY_STYLE[id];
  const texture = useCanvasTexture(() => paintBody(id));

  useFrame((_, delta) => {
    const p = bodyScenePosition(id, clock.getState().timeMs);
    ref.current?.position.set(p[0], p[1], p[2]);
    if (surface.current) surface.current.rotation.y += delta * spin;
  });

  return (
    <group ref={ref}>
      <group rotation={[0, 0, (tilt * Math.PI) / 180]}>
        <mesh ref={surface}>
          <sphereGeometry args={[radius, 64, 48]} />
          <meshStandardMaterial map={texture} roughness={1} metalness={0} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={hovered ? 0.3 : 0.1} />
        </mesh>
      </group>
      {atmosphere && <Atmosphere color={atmosphere} radius={radius} />}
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
        <sphereGeometry args={[Math.max(radius * 1.25, 0.5), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

interface ShipProps {
  mapFlight: MapFlight;
  clock: SimClock;
  glow: CanvasTexture;
  selected: boolean;
  onSelect: (mapFlight: MapFlight) => void;
  onHover: (flightId: number | null) => void;
}

const TAIL_POINTS = 28;
/** Share of the route covered by the engine trail. */
const TAIL_SPAN = 0.32;

const TAIL_START: Tuple3[] = Array.from({ length: TAIL_POINTS }, () => [0, 0, 0]);

/** Trail colours: full strength at the ship (index 0), falling away behind it. */
const tailColors = (color: string): Tuple3[] => {
  const head = hdr(color, 2.2);
  return Array.from({ length: TAIL_POINTS }, (_, n): Tuple3 => {
    const b = (1 - n / (TAIL_POINTS - 1)) ** 2.2;
    return [head.r * b, head.g * b, head.b * b];
  });
};

const Ship = ({ mapFlight, clock, glow, selected, onSelect, onHover }: ShipProps) => {
  const group = useRef<Group>(null);
  const halo = useRef<SpriteMaterial>(null);
  const route = useRef<ComponentRef<typeof Line>>(null);
  const tailRef = useRef<ComponentRef<typeof Line>>(null);
  const tailPositions = useRef(new Float32Array(TAIL_POINTS * 3));
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const arc = useMemo(() => flightArc(mapFlight), [mapFlight]);
  const points = useMemo(() => arcPoints(arc, 64).map(tuple), [arc]);
  const { flight } = mapFlight;
  const color = AVAILABILITY_COLOR[availability(flight)];
  const haloColor = useMemo(() => hdr(color, 2.4), [color]);
  const tail = useMemo(() => tailColors(color), [color]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getState().timeMs;
    const phase = flightPhase(mapFlight, t);
    const enroute = phase === 'enroute';
    const p = shipPosition(mapFlight, arc, t);
    g.position.set(p[0], p[1], p[2]);

    // Keep ships readable when zoomed out, without letting them swamp a planet up close.
    const distance = state.camera.position.distanceTo(g.position);
    const size = Math.min(2.6, Math.max(0.35, distance / 40));
    g.scale.setScalar(size * (enroute ? 1.5 : 0.6) * (hovered || selected ? 1.4 : 1));
    if (halo.current) halo.current.opacity = enroute || hovered || selected ? 1 : phase === 'arrived' ? 0.3 : 0.6;
    // Routes stay hidden until they matter: ten idle arcs at once is just clutter.
    if (route.current) route.current.material.opacity = hovered || selected ? 0.55 : enroute ? 0.4 : 0;

    const line = tailRef.current;
    if (line) {
      line.frustumCulled = false;
      line.visible = enroute;
      if (enroute) {
        const u = flightProgress(mapFlight, t);
        const positions = tailPositions.current;
        for (let n = 0; n < TAIL_POINTS; n++) {
          positions.set(arcPoint(arc, Math.max(0, u - (TAIL_SPAN * n) / (TAIL_POINTS - 1))), n * 3);
        }
        // Only ships in flight get here (one or two at a time), so rebuilding the small buffer is cheap.
        line.geometry.setPositions(positions);
      }
    }
  });

  return (
    <>
      <Line ref={route} points={points} color={color} lineWidth={1} dashed dashSize={0.35} gapSize={0.3} transparent opacity={0} depthWrite={false} />
      {/* No `visible` or `frustumCulled` props here: drei's Line also spreads extra props onto the material. Both are set in the frame loop. */}
      <Line ref={tailRef} points={TAIL_START} vertexColors={tail} lineWidth={2.4} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      <group ref={group}>
        <sprite scale={[2.2, 2.2, 1]}>
          <spriteMaterial ref={halo} map={glow} color={haloColor} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
        <mesh>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshBasicMaterial color={[3, 3, 3]} toneMapped={false} />
        </mesh>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(mapFlight);
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
          <sphereGeometry args={[0.8, 12, 12]} />
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
  /** Share of the width, from the left, where body labels are hidden. */
  quietLeft: number;
}

/**
 * Projects bodies and the hovered ship to screen pixels and moves their DOM labels there.
 * Plain DOM writes each frame, so labels track the scene without re-rendering React.
 */
const LabelProjector = ({ clock, labels, hoveredFlight, quietLeft }: LabelProjectorProps) => {
  useFrame(({ camera, size }) => {
    const t = clock.getState().timeMs;
    const fov = 'fov' in camera ? camera.fov : 50;
    const place = (key: string, p: Vec3, worldOffset: number, pixelOffset: number, fade = true) => {
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
      let x = (scratch.x * 0.5 + 0.5) * size.width;
      let y = (-scratch.y * 0.5 + 0.5) * size.height + worldOffset * pixelsPerUnit + pixelOffset;
      if (!fade) {
        // The tooltip is centred above its anchor: keep it inside the frame and clear of the page header.
        x = Math.min(size.width - 140, Math.max(140, x));
        y = Math.max(190, y);
      }
      el.style.visibility = 'visible';
      // Fade labels out where the page headline sits, so text never overlaps text.
      el.style.opacity = fade && quietLeft > 0 ? String(Math.min(1, Math.max(0, (x / size.width - quietLeft) / 0.06))) : '1';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };

    for (const id of BODY_IDS) {
      // Moon labels go above the moon, planet labels below, so a moon and its parent do not collide.
      const side = isMoon(id) ? -1 : 1;
      place(`body:${id}`, bodyScenePosition(id, t), side * BODY_STYLE[id].radius * 1.2, isMoon(id) ? -20 : 8);
    }
    if (hoveredFlight) place('ship', shipPosition(hoveredFlight, flightArc(hoveredFlight), t), 0, -22, false);
  });
  return null;
};

/** Positive x moves the scene right, positive y moves it down. */
export interface ViewShift {
  x: number;
  y: number;
}

const FINE_POINTER = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

/** Something the camera can fly to and then follow. */
export interface FocusTarget {
  /** Changes when the target does; a new key starts a new fly-to. */
  key: string;
  /** Camera distance once it has arrived, scene units. */
  distance: number;
  position: (tMs: number) => Vec3;
}

interface CameraRigProps {
  clock: SimClock;
  focus: FocusTarget | null;
  /** Shifts the picture by this share of the width and height, so the sun can sit off-centre beside page text. */
  viewShift: ViewShift;
}

const FLY_SECONDS = 1.4;
const INTRO_SECONDS = 3.2;

interface Flight3 {
  t: number;
  seconds: number;
  fromTarget: Vector3;
  fromOffset: Vector3;
  toOffset: Vector3;
}

/**
 * Opens with a slow descent into the resting view, then drifts around the sun.
 * Selecting a body or a ship flies to it and follows it; clearing the selection flies back.
 */
const CameraRig = ({ clock, focus, viewShift }: CameraRigProps) => {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const fly = useRef<Flight3 | null>(null);
  const mounted = useRef(false);
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);
  // Primitives, so a refetch that rebuilds the same target does not restart the fly-to.
  const focusKey = focus?.key ?? null;
  const focusDistance = focus?.distance ?? 0;

  useEffect(() => {
    const camera = get().camera as PerspectiveCamera;
    if (viewShift.x !== 0 || viewShift.y !== 0) {
      camera.setViewOffset(size.width, size.height, -viewShift.x * size.width, -viewShift.y * size.height, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    return () => camera.clearViewOffset();
  }, [get, size, viewShift.x, viewShift.y]);

  // On touch screens a drag must scroll the page, not spin the scene. OrbitControls
  // sets touch-action: none on the canvas, so put vertical panning back.
  useEffect(() => {
    if (!FINE_POINTER) get().gl.domElement.style.touchAction = 'pan-y';
  }, [get]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const resting = new Vector3(...DEFAULT_CAMERA_POSITION);
    if (!mounted.current) {
      mounted.current = true;
      fly.current = { t: 0, seconds: INTRO_SECONDS, fromTarget: new Vector3(), fromOffset: new Vector3(...INTRO_CAMERA_POSITION), toOffset: resting };
      return;
    }
    const fromOffset = c.object.position.clone().sub(c.target);
    const toOffset = focusKey ? fromOffset.clone().normalize().multiplyScalar(focusDistance) : resting;
    fly.current = { t: 0, seconds: FLY_SECONDS, fromTarget: c.target.clone(), fromOffset, toOffset };
  }, [focusKey, focusDistance]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const goal = focus ? focus.position(clock.getState().timeMs) : ([0, 0, 0] as const);
    const f = fly.current;
    if (f) {
      f.t = Math.min(1, f.t + delta / f.seconds);
      // Ease out: quick away, soft landing.
      const ease = 1 - (1 - f.t) ** 3;
      c.target.set(goal[0], goal[1], goal[2]).sub(f.fromTarget).multiplyScalar(ease).add(f.fromTarget);
      c.object.position.copy(f.fromOffset).lerp(f.toOffset, ease).add(c.target);
      c.enabled = f.t >= 1;
      if (f.t >= 1) fly.current = null;
    } else if (focus) {
      // Follow: move camera and target together so the user's own orbit is kept.
      const dx = goal[0] - c.target.x;
      const dy = goal[1] - c.target.y;
      const dz = goal[2] - c.target.z;
      c.target.set(goal[0], goal[1], goal[2]);
      c.object.position.set(c.object.position.x + dx, c.object.position.y + dy, c.object.position.z + dz);
    }
    c.autoRotate = !focus && !f;
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      // The map sits in the page flow: the wheel must keep scrolling the page.
      enableZoom={false}
      enableRotate={FINE_POINTER}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.5}
      autoRotateSpeed={0.35}
      minPolarAngle={0.35}
      maxPolarAngle={1.45}
    />
  );
};

export interface SolarSceneProps {
  clock: SimClock;
  mapFlights: MapFlight[];
  selectedBody: BodyId | null;
  selectedFlight: MapFlight | null;
  onSelectBody: (id: BodyId) => void;
  onSelectFlight: (mapFlight: MapFlight) => void;
  labels: LabelRegistry;
  hoveredFlight: MapFlight | null;
  onHoverFlight: (flightId: number | null) => void;
  viewShift: ViewShift;
}

export const SolarScene = ({
  clock,
  mapFlights,
  selectedBody,
  selectedFlight,
  onSelectBody,
  onSelectFlight,
  labels,
  hoveredFlight,
  onHoverFlight,
  viewShift,
}: SolarSceneProps) => {
  // Orbit shapes barely change over the flight window, so trace them once.
  const [orbitEpochMs] = useState(() => clock.getState().timeMs);
  const glow = useCanvasTexture(paintGlow);

  // Keyed on ids, so a refetch of the same flight does not restart the fly-to.
  const selectedFlightId = selectedFlight?.flight.flight_id ?? null;
  const focus = useMemo((): FocusTarget | null => {
    if (selectedBody) {
      return { key: `body:${selectedBody}`, distance: BODY_STYLE[selectedBody].radius * 5 + 5, position: (t) => bodyScenePosition(selectedBody, t) };
    }
    const mf = mapFlights.find((f) => f.flight.flight_id === selectedFlightId);
    if (!mf) return null;
    const arc = flightArc(mf);
    return { key: `flight:${selectedFlightId}`, distance: 11, position: (t) => shipPosition(mf, arc, t) };
  }, [selectedBody, selectedFlightId, mapFlights]);

  return (
    <>
      <color attach="background" args={['#030712']} />
      {/* Just enough fill to keep night sides readable. */}
      <ambientLight intensity={0.3} />
      <Backdrop />
      <ClockDriver clock={clock} mapFlights={mapFlights} />
      <Sun glow={glow} />
      {PLANET_IDS.map((id) => (
        <PlanetOrbit key={id} id={id} tMs={orbitEpochMs} />
      ))}
      {MOON_IDS.map((id) => (
        <MoonOrbit key={id} id={id} clock={clock} />
      ))}
      {BODY_IDS.map((id) => (
        <Body key={id} id={id} clock={clock} onSelect={onSelectBody} />
      ))}
      {mapFlights.map((mf) => (
        <Ship
          key={mf.flight.flight_id}
          mapFlight={mf}
          clock={clock}
          glow={glow}
          selected={mf.flight.flight_id === selectedFlightId}
          onSelect={onSelectFlight}
          onHover={onHoverFlight}
        />
      ))}
      <CameraRig clock={clock} focus={focus} viewShift={viewShift} />
      {/* After the rig, so labels use this frame's camera. */}
      <LabelProjector clock={clock} labels={labels} hoveredFlight={hoveredFlight} quietLeft={viewShift.x > 0 ? 0.44 : 0} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} radius={0.75} />
      </EffectComposer>
    </>
  );
};
