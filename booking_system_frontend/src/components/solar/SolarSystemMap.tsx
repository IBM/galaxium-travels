import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Flight } from '../../types';
import { AVAILABILITY_COLOR, AVAILABILITY_LABEL, BODY_STYLE, DEFAULT_CAMERA_POSITION } from '../../solar/bodyStyle';
import { availability, cheapestPrice, flightWindow, seatsLeft, toMapFlights } from '../../solar/flights';
import type { Availability, MapFlight } from '../../solar/flights';
import { BODY_IDS } from '../../solar/orbits';
import type { BodyId } from '../../solar/orbits';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { createSimClock } from '../../solar/simClock';
import { BodyPanel } from './BodyPanel';
import { SolarScene } from './SolarScene';
import { TimeScrubber } from './TimeScrubber';

interface SolarSystemMapProps {
  flights: Flight[];
  onBookFlight: (flight: Flight) => void;
}

// Shown only if the map opens with no flights to derive a range from.
const FALLBACK_START_MS = Date.UTC(2099, 0, 1);
const FALLBACK_END_MS = Date.UTC(2099, 0, 11);

const LEGEND: Availability[] = ['plenty', 'few', 'soldOut'];

const ShipTooltip = ({ mapFlight, labelRef }: { mapFlight: MapFlight; labelRef: (el: HTMLElement | null) => void }) => {
  const { flight } = mapFlight;
  const price = cheapestPrice(flight);
  const seats = seatsLeft(flight);
  return (
    <div ref={labelRef} className="invisible absolute left-0 top-0">
      <div className="-translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/15 bg-space-blue/95 px-3 py-2 text-xs text-star-white shadow-lg">
        <div className="text-sm font-semibold">
          {flight.origin} → {flight.destination}
        </div>
        <div className="text-star-white/70">Departs {formatDate(flight.departure_time)}</div>
        <div className="mt-1 flex items-center gap-3">
          <span>{price === null ? 'Sold out' : `From ${formatCurrency(price)}`}</span>
          <span style={{ color: AVAILABILITY_COLOR[availability(flight)] }}>
            {seats} seat{seats === 1 ? '' : 's'} left
          </span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-star-white/50">Click to book</div>
      </div>
    </div>
  );
};

/**
 * The 3D booking view. Default export so pages can load it with React.lazy
 * and keep three.js out of the main bundle.
 */
export default function SolarSystemMap({ flights, onBookFlight }: SolarSystemMapProps) {
  const mapFlights = useMemo(() => toMapFlights(flights), [flights]);
  const range = useMemo(() => flightWindow(mapFlights), [mapFlights]);
  const [selectedBody, setSelectedBody] = useState<BodyId | null>(null);

  const [clock] = useState(() => {
    const c = createSimClock(range?.startMs ?? FALLBACK_START_MS, range?.endMs ?? FALLBACK_END_MS);
    c.setPlaying(true);
    return c;
  });

  // Filters can change which flights are shown. Keep the current time if it still fits.
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
    <div className="relative h-[72vh] min-h-[540px] overflow-hidden rounded-xl border border-white/10 bg-space-dark">
      <Canvas
        camera={{ position: DEFAULT_CAMERA_POSITION, fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
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
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {BODY_IDS.map((id) => (
          <div key={id} ref={registerLabel(`body:${id}`)} className="invisible absolute left-0 top-0">
            <span
              className={`block -translate-x-1/2 whitespace-nowrap text-[11px] font-medium tracking-wide ${
                selectedBody === id ? 'text-star-white' : 'text-star-white/60'
              }`}
            >
              {BODY_STYLE[id].label}
            </span>
          </div>
        ))}
        {hoveredFlight && <ShipTooltip mapFlight={hoveredFlight} labelRef={registerLabel('ship')} />}
      </div>

      <div className="pointer-events-none absolute left-3 top-3 z-30 max-w-[15rem] rounded-xl border border-white/10 bg-space-blue/80 px-3 py-2 backdrop-blur-md">
        <ul className="space-y-1">
          {LEGEND.map((key) => (
            <li key={key} className="flex items-center gap-2 text-xs text-star-white/80">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AVAILABILITY_COLOR[key] }} />
              {AVAILABILITY_LABEL[key]}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-star-white/50">
          Planet angles are real (approximate for 2099). Distances and sizes are compressed, and ship paths are illustrative.
        </p>
      </div>

      {mapFlights.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-30 text-center text-sm text-star-white/70">
          No flights match your criteria
        </div>
      )}

      {selectedBody && (
        <BodyPanel bodyId={selectedBody} mapFlights={mapFlights} onClose={() => setSelectedBody(null)} onBookFlight={handleBook} />
      )}

      <TimeScrubber clock={clock} mapFlights={mapFlights} />
    </div>
  );
}
