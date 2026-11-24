import { useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { Pause, Play } from 'lucide-react';
import { flightPhase } from '../../solar/flights';
import type { MapFlight } from '../../solar/flights';
import type { SimClock } from '../../solar/simClock';

interface TimeScrubberProps {
  clock: SimClock;
  mapFlights: MapFlight[];
}

/** Slim timeline along the bottom of the map: play/pause, the simulated date, and one tick per departure. */
export const TimeScrubber = ({ clock, mapFlights }: TimeScrubberProps) => {
  const { timeMs, startMs, endMs, playing } = useSyncExternalStore(clock.subscribe, clock.getState);
  const span = Math.max(1, endMs - startMs);
  const percent = (ms: number) => `${Math.min(100, Math.max(0, ((ms - startMs) / span) * 100))}%`;
  const enroute = mapFlights.filter((f) => flightPhase(f, timeMs) === 'enroute');

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pt-16">
      <div className="container mx-auto flex items-center gap-4 px-4">
        <button
          type="button"
          onClick={() => clock.setPlaying(!playing)}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-star-white backdrop-blur-md transition-colors hover:bg-white/15"
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        <div className="shrink-0">
          <div className="font-mono text-sm tabular-nums text-star-white">{format(new Date(timeMs), 'dd MMM yyyy · HH:mm')}</div>
          <div className="h-4 text-[10px] uppercase tracking-[0.2em] text-star-white/45">
            {enroute.length > 0 ? enroute.map((f) => `${f.flight.origin} → ${f.flight.destination}`).join('  ·  ') : 'Next departure…'}
          </div>
        </div>

        <div className="relative h-9 min-w-0 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
          <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-cosmic-gradient" style={{ width: percent(timeMs) }} />
          {mapFlights.map((f) => (
            <span
              key={f.flight.flight_id}
              style={{ left: percent(f.departMs) }}
              className={`absolute top-1/2 h-2.5 w-px -translate-y-1/2 transition-colors ${f.departMs <= timeMs ? 'bg-star-white/80' : 'bg-star-white/30'}`}
            />
          ))}
          <span
            style={{ left: percent(timeMs) }}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-star-white shadow-[0_0_12px_rgba(249,250,251,0.9)]"
          />
          {/* Invisible native slider on top: keeps dragging, keyboard and screen-reader support. */}
          <input
            type="range"
            min={startMs}
            max={endMs}
            step={60_000}
            value={timeMs}
            onChange={(e) => clock.setTime(Number(e.target.value))}
            aria-label="Simulation time"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
};
