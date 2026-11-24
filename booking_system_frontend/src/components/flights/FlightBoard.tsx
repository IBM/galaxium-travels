import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { Flight, SeatClass } from '../../types';
import { PlanetOrb } from '../common';
import { getDestinationByName } from '../../data/destinations';
import { BODY_STYLE } from '../../solar/bodyStyle';
import { bodyIdForName, cheapestPrice, seatsLeft } from '../../solar/flights';
import { calculateDuration, formatCompactCredits, formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import { classSeatText, seatColor, seatOffers } from '../../utils/seatClasses';

interface FlightBoardProps {
  flights: Flight[];
  /** Shows placeholder rows instead of flights. */
  isLoading?: boolean;
  onBook: (flight: Flight, seatClass: SeatClass) => void;
}

// One column template for the header and every row, so the board reads as a table.
const COLUMNS = 'md:grid-cols-[6.5rem_minmax(14rem,1.6fr)_4.5rem_10.5rem_6rem_1rem]';

/** The API has no capacity field. Seeded flights have ten seats, so the meter shows up to ten. */
const METER_TICKS = 10;

const bodyColor = (name: string): string => {
  const id = bodyIdForName(name);
  return id ? BODY_STYLE[id].color : '#9DB2FF';
};

const SeatMeter = ({ seats }: { seats: number }) => {
  const color = seatColor(seats);
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: METER_TICKS }, (_, n) => (
          <span
            key={n}
            className="h-3 w-[3px] rounded-[1px] bg-white/10"
            style={n < seats ? { backgroundColor: color, boxShadow: `0 0 6px ${color}` } : undefined}
          />
        ))}
      </span>
      <span className="whitespace-nowrap font-mono text-[11px] text-star-white/55">{seats === 0 ? 'sold out' : `${seats} left`}</span>
    </div>
  );
};

const FlightRow = ({ flight, open, onToggle, onBook }: { flight: Flight; open: boolean; onToggle: () => void; onBook: FlightBoardProps['onBook'] }) => {
  const seats = seatsLeft(flight);
  const from = cheapestPrice(flight) ?? flight.economy_price;
  const destination = getDestinationByName(flight.destination);
  const detailId = `flight-${flight.flight_id}-classes`;

  return (
    <li className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className={clsx(
          'group grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.045] md:h-16 md:gap-4 md:px-5 md:py-0',
          COLUMNS,
          open && 'bg-white/[0.045]',
          seats === 0 && 'opacity-50'
        )}
      >
        <span>
          <span className="block font-mono text-sm font-medium">{formatTime(flight.departure_time)}</span>
          <span className="block whitespace-nowrap font-mono text-[11px] text-star-white/40">{formatDate(flight.departure_time, 'dd MMM yyyy')}</span>
        </span>

        <span className="flex min-w-0 items-center gap-2.5">
          <PlanetOrb name={flight.origin} size={14} glow={false} />
          <span className="text-[15px] font-medium">{flight.origin}</span>
          <span
            className="relative h-px min-w-6 flex-1 opacity-75"
            style={{ backgroundImage: `linear-gradient(90deg, ${bodyColor(flight.origin)}, ${bodyColor(flight.destination)})` }}
            aria-hidden
          >
            <span className="absolute left-1/2 top-[-3px] h-[7px] w-[7px] rotate-45 border-r border-t border-white group-hover:animate-fly motion-reduce:animate-none" />
          </span>
          <span className="sr-only">to</span>
          <span className="text-[15px] font-medium">{flight.destination}</span>
          <PlanetOrb name={flight.destination} size={14} glow={false} />
        </span>

        <span className="hidden font-mono text-xs text-star-white/55 md:block">{calculateDuration(flight.departure_time, flight.arrival_time)}</span>

        <span className="order-last col-span-3 md:order-none md:col-span-1">
          <SeatMeter seats={seats} />
        </span>

        <span className="text-right">
          <span className="block font-mono text-sm font-medium">{formatCompactCredits(from)}</span>
          <span className="block text-[9px] uppercase tracking-[0.2em] text-star-white/40">credits</span>
        </span>

        <ChevronRight size={14} className={clsx('hidden justify-self-end text-star-white/40 transition-transform duration-300 md:block', open && 'rotate-90 text-star-white')} />
      </button>

      {/* Seat classes open in place. Closed content is inert so it is skipped by keyboard and screen readers. */}
      <div id={detailId} inert={!open} className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
            {seatOffers(flight).map((offer, index) => (
              <div key={offer.id} className="flex flex-col items-start gap-1.5 bg-[#070c1b] px-5 py-4">
                <span className={clsx('eyebrow', offer.seats === 0 && 'opacity-40')}>{offer.label}</span>
                <span className={clsx('font-mono text-xl font-medium', offer.seats === 0 && 'opacity-40')}>{formatCurrency(offer.price)}</span>
                <span className="flex items-center gap-2 text-xs text-star-white/55">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seatColor(offer.seats, 1), boxShadow: `0 0 8px ${seatColor(offer.seats, 1)}` }} />
                  {classSeatText(offer.seats)}
                </span>
                {offer.seats > 0 && (
                  <button
                    type="button"
                    onClick={() => onBook(flight, offer.id)}
                    className={clsx(index === 0 ? 'btn-primary' : 'btn-secondary', 'mt-2 px-4 py-2 text-[10px]')}
                  >
                    Hold seat
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#070c1b] px-5 py-2.5">
            <span className="font-mono text-[11px] text-star-white/40">
              Flight #{flight.flight_id} · arrives {formatDate(flight.arrival_time, 'dd MMM, HH:mm')}
            </span>
            {destination && (
              <Link to={`/destinations/${destination.slug}`} className="text-link">
                About {destination.name}
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

const SkeletonRow = () => (
  <li className="flex h-16 items-center gap-6 border-b border-white/10 px-5 last:border-b-0" aria-hidden>
    <span className="h-3 w-16 animate-shimmer rounded bg-white/10" />
    <span className="h-3 flex-1 animate-shimmer rounded bg-white/10" />
    <span className="hidden h-3 w-28 animate-shimmer rounded bg-white/10 md:block" />
    <span className="h-3 w-12 animate-shimmer rounded bg-white/10" />
  </li>
);

/** Departure board: one row per flight, seat classes open in place. */
export const FlightBoard = ({ flights, isLoading = false, onBook }: FlightBoardProps) => {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="panel overflow-hidden" aria-busy={isLoading}>
      <div className={clsx('eyebrow hidden h-10 items-center gap-4 border-b border-white/10 px-5 md:grid', COLUMNS)} aria-hidden>
        <span>Departs</span>
        <span>Route</span>
        <span>Transit</span>
        <span>Seats</span>
        <span className="text-right">From</span>
        <span />
      </div>
      <ul>
        {isLoading
          ? Array.from({ length: 6 }, (_, n) => <SkeletonRow key={n} />)
          : flights.map((flight) => (
              <FlightRow
                key={flight.flight_id}
                flight={flight}
                open={openId === flight.flight_id}
                onToggle={() => setOpenId(openId === flight.flight_id ? null : flight.flight_id)}
                onBook={onBook}
              />
            ))}
      </ul>
    </div>
  );
};
