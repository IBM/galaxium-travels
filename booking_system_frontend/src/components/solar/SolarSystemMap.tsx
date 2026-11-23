import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Flight } from '../../types';
import { AVAILABILITY_COLOR, BODY_STYLE, INTRO_CAMERA_POSITION } from '../../solar/bodyStyle';
import { availability, cheapestPrice, flightWindow, seatsLeft, toMapFlights } from '../../solar/flights';
import type { MapFlight } from '../../solar/flights';
import { BODY_IDS, isMoon } from '../../solar/orbits';
import type { BodyId } from '../../solar/orbits';
import { createSimClock } from '../../solar/simClock';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { BodyPanel } from './BodyPanel';
import { SolarScene } from './SolarScene';
import type { ViewShift } from './SolarScene';
import { TimeScrubber } from './TimeScrubber';

interface SolarSystemMapProps {
  flights: Flight[];
  onBookFlight: (flight: Flight) => void;
  /** Shifts the scene within the frame, to leave room for page text. */
  viewShift?: ViewShift;
}

// Used only until flights load, or if they never do.
const FALLBACK_START_MS = Date.UTC(2099, 0, 1);
const FALLBACK_END_MS = Date.UTC(2099, 0, 11);

const ShipTooltip = ({ mapFlight, labelRef }: { mapFlight: MapFlight; labelRef: (el: HTMLElement | null) => void }) => {
  const { flight } = mapFlight;
  const price = cheapestPrice(flight);
  const seats = seatsLeft(flight);
  const color = AVAILABILITY_COLOR[availability(flight)];
  return (
    <div ref={labelRef} className="invisible absolute left-0 top-0">
      <div className="-translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-white/15 bg-space-dark/85 px-4 py-3 text-star-white shadow-2xl shadow-black/60 backdrop-blur-md">
        <div className="text-sm font-semibold tracking-wide">
          {flight.origin} <span className="text-star-white/40">→</span> {flight.destination}
        </div>
        <div className="mt-0.5 text-xs text-star-white/60">{formatDate(flight.departure_time, 'MMM dd, HH:mm')}</div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="font-medium">{price === null ? 'Sold out' : `from ${formatCurrency(price)}`}</span>
          <span className="flex items-center gap-1.5" style={{ color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {seats} seat{seats === 1 ? '' : 's'} left
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * The live solar system: a canvas that fills its parent, with labels, a timeline
 * and a body panel laid over it. Default export so pages can load it with
 * React.lazy and keep three.js out of the main bundle.
 */
const NO_SHIFT: ViewShift = { x: 0, y: 0 };

export default function SolarSystemMap({ flights, onBookFlight, viewShift = NO_SHIFT }: SolarSystemMapProps) {
  const mapFlights = useMemo(() => toMapFlights(flights), [flights]);
  const range = useMemo(() => flightWindow(mapFlights, 3), [mapFlights]);
  const [selectedBody, setSelectedBody] = useState<BodyId | null>(null);
  const [ready, setReady] = useState(false);

  const [clock] = useState(() => {
    const c = createSimClock(range?.startMs ?? FALLBACK_START_MS, range?.endMs ?? FALLBACK_END_MS);
    c.setPlaying(true);
    return c;
  });

  // Flights arrive after the first render, and a booking refetches them. Keep the current time if it still fits.
  useEffect(() => {
    if (range) clock.setRange(range.startMs, range.endMs);
  }, [clock, range]);

  const handleBook = (mapFlight: MapFlight) => onBookFlight(mapFlight.flight);

  // Labels are DOM elements over the canvas. The scene moves them every frame.
  const labels = useRef(new Map<string, HTMLElement>());
  const registerLabel = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) labels.current.set(key, el);
      else labels.current.delete(key);
    },
    [],
  );
  const [hoveredFlightId, setHoveredFlightId] = useState<number | null>(null);
  const hoveredFlight = mapFlights.find((f) => f.flight.flight_id === hoveredFlightId) ?? null;

  return (
    <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}>
      <Canvas
        flat
        camera={{ position: INTRO_CAMERA_POSITION, fov: 42, near: 0.1, far: 3000 }}
        dpr={[1, 1.75]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={() => setReady(true)}
        onPointerMissed={() => setSelectedBody(null)}
      >
        <SolarScene
          clock={clock}
          mapFlights={mapFlights}
          selectedBody={selectedBody}
          onSelectBody={setSelectedBody}
          onBookFlight={handleBook}
          labels={labels}
          hoveredFlight={hoveredFlight}
          onHoverFlight={setHoveredFlightId}
          viewShift={viewShift}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {BODY_IDS.map((id) => (
          <div key={id} ref={registerLabel(`body:${id}`)} className="invisible absolute left-0 top-0">
            <span
              className={`block -translate-x-1/2 whitespace-nowrap font-medium uppercase transition-colors duration-300 ${
                isMoon(id) ? 'text-[9px] tracking-[0.2em]' : 'text-[10px] tracking-[0.28em]'
              } ${selectedBody === id ? 'text-star-white' : 'text-star-white/55'}`}
              style={{ textShadow: '0 0 12px rgba(3, 7, 18, 0.9)' }}
            >
              {BODY_STYLE[id].label}
            </span>
          </div>
        ))}
        {hoveredFlight && <ShipTooltip mapFlight={hoveredFlight} labelRef={registerLabel('ship')} />}
      </div>

      {selectedBody && (
        <BodyPanel bodyId={selectedBody} mapFlights={mapFlights} onClose={() => setSelectedBody(null)} onBookFlight={handleBook} />
      )}

      <TimeScrubber clock={clock} mapFlights={mapFlights} />
    </div>
  );
}
