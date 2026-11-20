import { useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { Pause, Play } from 'lucide-react';
import type { MapFlight } from '../../solar/flights';
import { SPEEDS } from '../../solar/simClock';
import type { SimClock } from '../../solar/simClock';

interface TimeScrubberProps {
  clock: SimClock;
  mapFlights: MapFlight[];
}

export const TimeScrubber = ({ clock, mapFlights }: TimeScrubberProps) => {
  const { timeMs, startMs, endMs, playing, speed } = useSyncExternalStore(clock.subscribe, clock.getState);
  const span = Math.max(1, endMs - startMs);
  const percent = (ms: number) => `${((ms - startMs) / span) * 100}%`;

  return (
    <div className="absolute inset-x-3 bottom-3 z-30 rounded-xl border border-white/10 bg-space-blue/85 px-4 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => clock.setPlaying(!playing)}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cosmic-gradient text-white transition-shadow hover:shadow-lg hover:shadow-cosmic-purple/50"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <div className="min-w-[10.5rem] font-mono text-sm tabular-nums text-star-white">
          {format(new Date(timeMs), 'MMM dd, yyyy HH:mm')}
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => clock.setSpeed(s)}
              title={`${s} simulated hour${s === 1 ? '' : 's'} per second`}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                speed === s ? 'bg-cosmic-purple text-white' : 'bg-white/5 text-star-white/70 hover:bg-white/10'
              }`}
            >
              {s} h/s
            </button>
          ))}
        </div>

        <div className="relative min-w-[12rem] flex-1 pt-3">
          {/* One tick per departure. Click a tick to jump to that departure. */}
          <div className="absolute inset-x-2 top-0 h-3">
            {mapFlights.map((f) => (
              <button
                key={f.flight.flight_id}
                type="button"
                onClick={() => clock.setTime(f.departMs)}
                title={`${f.flight.origin} → ${f.flight.destination}, departs ${format(new Date(f.departMs), 'MMM dd HH:mm')}`}
                aria-label={`Jump to departure of ${f.flight.origin} to ${f.flight.destination}`}
                style={{ left: percent(f.departMs) }}
                className={`absolute top-0 h-3 w-1 -translate-x-1/2 rounded-full transition-colors hover:bg-star-white ${
                  f.departMs <= timeMs ? 'bg-cosmic-purple' : 'bg-star-white/40'
                }`}
              />
            ))}
          </div>
          <input
            type="range"
            min={startMs}
            max={endMs}
            step={60_000}
            value={timeMs}
            onChange={(e) => clock.setTime(Number(e.target.value))}
            aria-label="Simulation time"
            className="block w-full cursor-pointer accent-cosmic-purple"
          />
        </div>
      </div>
    </div>
  );
};
