import type { ReactNode } from 'react';
import type { Booking, Flight } from '../../types';
import { Button, PlanetOrb } from '../common';
import { AVAILABILITY_COLOR, BODY_STYLE } from '../../solar/bodyStyle';
import { bodyIdForName } from '../../solar/flights';
import { calculateDuration, formatCurrency, formatDate } from '../../utils/formatters';
import { seatClassLabel } from '../../utils/seatClasses';
import { useUser } from '../../hooks/useUserContext';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface BookingCardProps {
  booking: Booking;
  flight?: Flight;
  onCancel: (bookingId: number) => void;
  isCancelling?: boolean;
}

const STATUS_COLOR: Record<Booking['status'], string> = {
  booked: AVAILABILITY_COLOR.plenty,
  cancelled: AVAILABILITY_COLOR.soldOut,
  completed: '#9DB2FF',
};

const bodyColor = (name: string): string => {
  const id = bodyIdForName(name);
  return id ? BODY_STYLE[id].color : '#9DB2FF';
};

const Fact = ({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) => (
  <div className="min-w-0">
    <dt className="mb-1 text-[9px] uppercase tracking-[0.22em] text-star-white/40">{label}</dt>
    <dd className={clsx('truncate text-[13px] text-star-white', mono && 'font-mono tabular-nums')}>{children}</dd>
  </div>
);

/** One end of the route: planet, name, and the time there. */
const Leg = ({ name, time, align = 'left' }: { name: string; time: string; align?: 'left' | 'right' }) => (
  <div className={clsx('flex min-w-0 items-center gap-3', align === 'right' && 'flex-row-reverse text-right')}>
    <PlanetOrb name={name} size={40} />
    <div className="min-w-0">
      <p className="truncate text-2xl font-semibold uppercase leading-none tracking-tight sm:text-[28px]">{name}</p>
      <p className="mt-1.5 whitespace-nowrap font-mono text-[11px] text-star-white/55">{formatDate(time, 'dd MMM yyyy · HH:mm')}</p>
    </div>
  </div>
);

/** A booking drawn as a boarding pass: route and passenger on the main part, reference on the stub. */
export const BookingCard = ({ booking, flight, onCancel, isCancelling }: BookingCardProps) => {
  const { user } = useUser();
  const color = STATUS_COLOR[booking.status];
  const canCancel = booking.status === 'booked';
  const reference = `#${String(booking.booking_id).padStart(4, '0')}`;
  const gradientId = `route-${booking.booking_id}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx('panel relative grid overflow-hidden sm:grid-cols-[1fr_9rem]', !canCancel && 'opacity-60')}
    >
      {/* A line of light along the top edge, like the orbit lines on the map. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9DB2FF]/70 to-transparent" aria-hidden />

      <div className="grid min-w-0 gap-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow truncate">Galaxium Travels · Boarding pass</span>
          <span
            className="flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1a` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            {booking.status}
          </span>
        </div>

        {flight ? (
          <div className="grid grid-cols-[auto_minmax(2.5rem,1fr)_auto] items-center gap-4">
            <Leg name={flight.origin} time={flight.departure_time} />
            <div className="relative h-9" aria-hidden>
              <svg viewBox="0 0 200 34" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <defs>
                  <linearGradient id={gradientId}>
                    <stop offset="0" stopColor={bodyColor(flight.origin)} />
                    <stop offset="1" stopColor={bodyColor(flight.destination)} />
                  </linearGradient>
                </defs>
                <path d="M2 30 Q100 -22 198 30" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.2" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="absolute inset-x-0 -bottom-3 hidden whitespace-nowrap text-center font-mono text-[10px] text-star-white/40 sm:block">
                {calculateDuration(flight.departure_time, flight.arrival_time)} transit
              </span>
            </div>
            <Leg name={flight.destination} time={flight.arrival_time} align="right" />
          </div>
        ) : (
          <p className="text-sm text-star-white/60">Flight #{booking.flight_id}</p>
        )}

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Passenger">{user?.name ?? '—'}</Fact>
          <Fact label="Class">{seatClassLabel(booking.seat_class)}</Fact>
          <Fact label="Flight" mono>
            #{booking.flight_id}
          </Fact>
          <Fact label="Paid" mono>
            {formatCurrency(booking.price_paid)}
          </Fact>
        </dl>

        <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
          <span className="text-xs text-star-white/40">Booked {formatDate(booking.booking_time, 'dd MMM yyyy, HH:mm')}</span>
          {canCancel && (
            <Button variant="link" onClick={() => onCancel(booking.booking_id)} isLoading={isCancelling}>
              Cancel booking
            </Button>
          )}
        </div>
      </div>

      {/* Stub, with the notches of a tear-off line. */}
      <div className="relative flex items-center justify-between gap-4 border-t border-dashed border-white/20 p-6 sm:flex-col sm:items-stretch sm:border-l sm:border-t-0 sm:px-5">
        <span className="absolute -left-2.5 -top-2.5 hidden h-5 w-5 rounded-full border border-white/10 bg-space-dark sm:block" aria-hidden />
        <span className="absolute -bottom-2.5 -left-2.5 hidden h-5 w-5 rounded-full border border-white/10 bg-space-dark sm:block" aria-hidden />
        <div>
          <p className="eyebrow">Booking</p>
          <p className="mt-1 font-mono text-xl tabular-nums">{reference}</p>
        </div>
        {/* Decorative: not a scannable code. */}
        <div
          className="h-12 w-28 opacity-70 sm:w-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #F9FAFB 0 2px, transparent 2px 4px, #F9FAFB 4px 5px, transparent 5px 9px, #F9FAFB 9px 12px, transparent 12px 14px)',
          }}
          aria-hidden
        />
        {flight && (
          <p className="eyebrow hidden tracking-[0.2em] sm:block">
            {flight.origin} → {flight.destination}
          </p>
        )}
      </div>
    </motion.article>
  );
};

// Made with Bob
