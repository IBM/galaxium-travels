import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Button, PlanetOrb } from '../components/common';
import { MousePointerClick } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { ALL_DESTINATIONS } from '../data/destinations';
import { BookingModal } from '../components/bookings/BookingModal';
import { HOLD_DURATION_MS } from '../components/bookings/HoldRing';
import { MapErrorBoundary } from '../components/solar/MapErrorBoundary';
import { UserIdentification } from '../components/user/UserIdentification';
import { useUser } from '../hooks/useUserContext';
import { getFlights } from '../services/api';
import { BODY_STYLE } from '../solar/bodyStyle';
import { bodyIdForName, cheapestPrice, seatsLeft, toMapFlights } from '../solar/flights';
import { isWebGLAvailable } from '../solar/webgl';
import { calculateDuration, formatCompactCredits, formatDate } from '../utils/formatters';
import { SEAT_CLASSES } from '../utils/seatClasses';
import type { Flight } from '../types';

// Lazy, so three.js loads after the page text is already on screen.
const SolarSystemMap = lazy(() => import('../components/solar/SolarSystemMap'));

const WIDE_SCREEN = '(min-width: 1024px)';
const subscribeToWidth = (onChange: () => void) => {
  const query = window.matchMedia(WIDE_SCREEN);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const isWideScreen = () => window.matchMedia(WIDE_SCREEN).matches;

// Wide screens: sun right of centre, headline on the left. Narrow screens: sun below the headline.
const WIDE_SHIFT = { x: 0.17, y: 0 };
const NARROW_SHIFT = { x: 0, y: 0.2 };

export const Home = () => {
  const { user } = useUser();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  // Without WebGL, or if the scene throws, the hero is just the text over the page starfield.
  const [mapAvailable, setMapAvailable] = useState(isWebGLAvailable);
  const wide = useSyncExternalStore(subscribeToWidth, isWideScreen);

  // The hero works without flights (planets only), so a failed request is not surfaced here.
  const loadFlights = useCallback(() => {
    getFlights()
      .then(setFlights)
      .catch((error) => console.warn('Home: could not load flights for the solar map', error));
  }, []);

  useEffect(() => {
    loadFlights();
  }, [loadFlights]);

  const handleBookFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    if (user) setShowBookingModal(true);
    else setShowUserModal(true);
  };

  // Facts for the page below the map, all taken from the live schedule.
  const mapFlights = useMemo(() => toMapFlights(flights), [flights]);
  const nextDeparture = useMemo(
    () => [...mapFlights].filter((f) => seatsLeft(f.flight) > 0).sort((x, y) => x.departMs - y.departMs)[0]?.flight ?? null,
    [mapFlights]
  );
  /** Shortest transit and lowest open price among the flights to one destination. */
  const routeFacts = (name: string): string | null => {
    const inbound = mapFlights.filter((f) => f.flight.destination === name);
    if (inbound.length === 0) return null;
    const fastest = inbound.reduce((best, f) => (f.arriveMs - f.departMs < best.arriveMs - best.departMs ? f : best));
    const prices = inbound.map((f) => cheapestPrice(f.flight)).filter((price): price is number => price !== null);
    const transit = calculateDuration(fastest.flight.departure_time, fastest.flight.arrival_time);
    return prices.length ? `${transit} · from ${formatCompactCredits(Math.min(...prices))}` : `${transit} · sold out`;
  };

  const stats = [
    { value: flights.length ? String(flights.length) : '—', label: 'Scheduled departures' },
    { value: String(ALL_DESTINATIONS.length), label: 'Worlds served' },
    { value: `${HOLD_DURATION_MS / 60000}:00`, label: 'Minutes to confirm a held seat' },
    { value: String(SEAT_CLASSES.length), label: 'Cabin classes' },
  ];

  return (
    <div className="space-y-20">
      {/* Hero: the live solar system fills the first screen, edge to edge, under the header. */}
      <section className="absolute inset-x-0 top-0 h-screen min-h-[640px] overflow-hidden">
        {mapAvailable && (
          <MapErrorBoundary onError={() => setMapAvailable(false)}>
            <Suspense fallback={null}>
              <SolarSystemMap
                flights={flights}
                onBookFlight={handleBookFlight}
                viewShift={wide ? WIDE_SHIFT : NARROW_SHIFT}
                paused={showUserModal || showBookingModal}
              />
            </Suspense>
          </MapErrorBoundary>
        )}

        {/* Scrims: keep the headline readable and blend the scene into the page below. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-space-dark/85 via-space-dark/30 via-45% to-transparent lg:bg-gradient-to-r lg:from-space-dark/90 lg:via-space-dark/45 lg:via-35%" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-space-dark to-transparent" />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="container mx-auto flex h-full items-start px-4 pt-36 lg:items-center lg:pt-0">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left"
            >
              <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.35em] text-star-white/60 sm:text-xs md:mb-5">
                Live departures · January 2099
              </p>
              <h1 className="mb-4 text-4xl font-bold leading-[1.05] sm:text-5xl md:mb-6 md:text-7xl">
                <span className="bg-cosmic-gradient bg-clip-text text-transparent">Journey Beyond</span>
                <br />
                <span className="text-star-white">The Stars</span>
              </h1>
              <p className="mb-6 text-base text-star-white/75 md:mb-8 md:text-lg">
                Seven worlds, ten flights, one map. Every light is a scheduled flight: catch one before it leaves.
              </p>
              <div className="pointer-events-auto flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Link to="/flights" className="btn-primary px-7 py-3.5 text-xs">
                  Explore Flights
                </Link>
                {mapAvailable && (
                  <span className="hidden items-center gap-2 text-sm text-star-white/55 sm:flex">
                    <MousePointerClick size={16} />
                    Click a ship or a planet
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {mapAvailable && (
          <p className="pointer-events-none absolute bottom-1.5 right-4 z-20 text-[10px] text-star-white/35">
            Planet positions approximate · distances compressed · routes illustrative
          </p>
        )}
      </section>
      {/* Reserves the hero's height in the page flow (the section above is absolutely positioned). */}
      <div aria-hidden className="!mt-0 h-[calc(100vh-6rem)] min-h-[544px]" />

      {/* The schedule in four numbers */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 border-y border-white/10 lg:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={clsx(
              'px-5 py-6',
              index % 2 === 1 && 'border-l border-white/10',
              index >= 2 && 'border-t border-white/10 lg:border-t-0',
              index === 2 && 'lg:border-l'
            )}
          >
            <p className="mb-1.5 font-mono text-3xl font-medium tabular-nums">{stat.value}</p>
            <p className="eyebrow">{stat.label}</p>
          </div>
        ))}
      </motion.section>

      {/* Destinations: the planets from the map, each linking to its page */}
      <section>
        <p className="eyebrow mb-3">Destinations</p>
        <h2 className="mb-8 text-3xl font-semibold tracking-tight text-star-white md:text-4xl">Seven worlds, one schedule</h2>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {ALL_DESTINATIONS.map((dest, index) => {
            const bodyId = bodyIdForName(dest.name);
            return (
              <motion.div
                key={dest.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
              >
                <Link
                  to={`/destinations/${dest.slug}`}
                  className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-transparent px-2 pb-5 pt-4 text-center transition duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <span className="flex h-24 items-center justify-center">
                    <PlanetOrb
                      name={dest.name}
                      size={bodyId ? Math.round(32 + BODY_STYLE[bodyId].radius * 36) : 48}
                      className="transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                  <span className="text-[15px] font-medium text-star-white">{dest.name}</span>
                  <span className="font-mono text-[11px] text-star-white/55">{routeFacts(dest.name) ?? dest.facts.typicalTransitTime}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Next departure */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex flex-wrap items-center justify-between gap-6 border-t border-white/10 pt-8"
      >
        <div>
          <p className="eyebrow mb-3">{nextDeparture ? 'Next departure' : 'Departures'}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-star-white md:text-3xl">
            {nextDeparture ? (
              <>
                {nextDeparture.origin} <span className="text-star-white/40">→</span> {nextDeparture.destination}
              </>
            ) : (
              'See what is leaving'
            )}
          </h2>
          {nextDeparture && (
            <p className="mt-2 font-mono text-xs text-star-white/55">
              {formatDate(nextDeparture.departure_time, 'dd MMM yyyy · HH:mm')} · {seatsLeft(nextDeparture)} seats open
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/flights" className={nextDeparture ? 'btn-secondary' : 'btn-primary'}>
            All departures
          </Link>
          {nextDeparture && <Button onClick={() => handleBookFlight(nextDeparture)}>Hold a seat</Button>}
        </div>
      </motion.section>

      <UserIdentification isOpen={showUserModal} onClose={() => setShowUserModal(false)} onSuccess={() => setShowBookingModal(true)} />
      <BookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} flight={selectedFlight} onSuccess={loadFlights} />
    </div>
  );
};

// Made with Bob
