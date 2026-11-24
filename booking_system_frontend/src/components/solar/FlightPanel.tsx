import { useSyncExternalStore } from 'react';
import { History, X } from 'lucide-react';
import { AVAILABILITY_COLOR } from '../../solar/bodyStyle';
import { BOARDING_LEAD_MS, availability, flightPhase, flightProgress, isBookable, seatsLeft } from '../../solar/flights';
import type { MapFlight } from '../../solar/flights';
import type { SimClock } from '../../solar/simClock';
import { calculateDuration, formatCurrency, formatDate } from '../../utils/formatters';

interface FlightPanelProps {
  mapFlight: MapFlight;
  clock: SimClock;
  onClose: () => void;
  onBook: (mapFlight: MapFlight) => void;
}

const HOUR_MS = 3_600_000;

/** "in 5 h", "in 40 min", "2 d 3 h ago" */
const span = (ms: number): string => {
  const abs = Math.abs(ms);
  if (abs < HOUR_MS) return `${Math.max(1, Math.round(abs / 60_000))} min`;
  if (abs < 48 * HOUR_MS) return `${Math.round(abs / HOUR_MS)} h`;
  return `${Math.floor(abs / (24 * HOUR_MS))} d ${Math.round((abs % (24 * HOUR_MS)) / HOUR_MS)} h`;
};

/**
 * Card for one ship. The simulation clock is "now": a flight can be booked while
 * its ship is still docked. Once it has left, the card shows live progress and
 * offers to rewind the clock to boarding instead.
 */
export const FlightPanel = ({ mapFlight, clock, onClose, onBook }: FlightPanelProps) => {
  const { timeMs, startMs } = useSyncExternalStore(clock.subscribe, clock.getState);
  const { flight, departMs, arriveMs } = mapFlight;
  const phase = flightPhase(mapFlight, timeMs);
  const progress = flightProgress(mapFlight, timeMs);
  const bookable = isBookable(mapFlight, timeMs);
  const seats = seatsLeft(flight);
  const color = AVAILABILITY_COLOR[availability(flight)];

  const status =
    phase === 'docked'
      ? { label: 'Boarding', detail: `Departs in ${span(departMs - timeMs)}`, tone: 'text-alien-green border-alien-green/40 bg-alien-green/10' }
      : phase === 'enroute'
        ? { label: 'In flight', detail: `Arrives in ${span(arriveMs - timeMs)}`, tone: 'text-space-blue border-white/0 bg-star-white' }
        : { label: 'Arrived', detail: `Landed ${span(timeMs - arriveMs)} ago`, tone: 'text-star-white/70 border-white/20 bg-white/5' };

  const rewind = () => {
    clock.setPlaying(false);
    clock.setTime(Math.max(startMs, departMs - BOARDING_LEAD_MS));
  };

  const classes = [
    ['Economy', flight.economy_price, flight.economy_seats_available],
    ['Business', flight.business_price, flight.business_seats_available],
    ['Galaxium', flight.galaxium_price, flight.galaxium_seats_available],
  ] as const;

  return (
    <aside className="absolute bottom-28 right-4 top-28 z-30 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-dark/75 shadow-2xl shadow-black/60 backdrop-blur-xl lg:right-10">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-star-white/50">Flight #{flight.flight_id}</p>
          <h2 className="mt-1 text-lg font-bold text-star-white">
            {flight.origin} <span className="text-star-white/40">→</span> {flight.destination}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close panel" className="text-star-white/60 transition-colors hover:text-star-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${status.tone}`}>{status.label}</span>
            <span className="text-xs tabular-nums text-star-white/70">{status.detail}</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-cosmic-gradient" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-star-white/60">
            <span>{formatDate(flight.departure_time, 'MMM dd, HH:mm')}</span>
            <span>{calculateDuration(flight.departure_time, flight.arrival_time)}</span>
            <span>{formatDate(flight.arrival_time, 'MMM dd, HH:mm')}</span>
          </div>
        </div>

        <div>
          <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-star-white/60">
            Seats
            <span className="flex items-center gap-1.5 font-medium normal-case tracking-normal" style={{ color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
              {seats} left
            </span>
          </h3>
          <ul className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
            {classes.map(([name, price, left]) => (
              <li key={name} className={`flex items-center justify-between px-3 py-2 text-sm ${left === 0 ? 'opacity-40' : ''}`}>
                <span className="text-star-white">{name}</span>
                <span className="text-right">
                  <span className="block font-semibold text-star-white">{formatCurrency(price)}</span>
                  <span className="block text-[11px] text-star-white/50">{left === 0 ? 'Sold out' : `${left} left`}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        {bookable ? (
          <button type="button" onClick={() => onBook(mapFlight)} className="btn-primary w-full">
            Book this flight
          </button>
        ) : phase === 'docked' ? (
          <p className="text-center text-sm text-star-white/60">This flight is sold out.</p>
        ) : (
          <>
            <p className="mb-3 text-center text-xs text-star-white/60">
              {phase === 'enroute' ? 'This ship has already left, so booking is closed.' : 'This flight has landed, so booking is closed.'}
            </p>
            <button type="button" onClick={rewind} className="btn-secondary flex w-full items-center justify-center gap-2">
              <History size={16} />
              Rewind to boarding
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
