import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common';
import { Rocket, Globe, Shield, Zap, MousePointerClick } from 'lucide-react';
import { motion } from 'framer-motion';
import { ALL_DESTINATIONS } from '../data/destinations';
import { BookingModal } from '../components/bookings/BookingModal';
import { MapErrorBoundary } from '../components/solar/MapErrorBoundary';
import { UserIdentification } from '../components/user/UserIdentification';
import { useUser } from '../hooks/useUserContext';
import { getFlights } from '../services/api';
import { isWebGLAvailable } from '../solar/webgl';
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

  const features = [
    {
      icon: <Rocket size={32} />,
      title: 'Interplanetary Travel',
      description: 'Explore destinations across the solar system with our state-of-the-art spacecraft.',
    },
    {
      icon: <Globe size={32} />,
      title: 'Multiple Destinations',
      description: 'From Mars to Europa, discover new worlds and book your journey today.',
    },
    {
      icon: <Shield size={32} />,
      title: 'Safe & Secure',
      description: 'Your safety is our priority with advanced navigation and life support systems.',
    },
    {
      icon: <Zap size={32} />,
      title: 'Instant Booking',
      description: 'Book your flight in seconds and receive instant confirmation.',
    },
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
                <Link to="/flights">
                  <Button size="lg">Explore Flights</Button>
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

      {/* Features Section */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12 text-star-white"
        >
          Why Choose Galaxium?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 text-center hover:bg-white/10 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cosmic-gradient mb-4">
                <div className="text-white">{feature.icon}</div>
              </div>
              <h3 className="text-xl font-semibold text-star-white mb-2">
                {feature.title}
              </h3>
              <p className="text-star-white/70">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Explore Destinations Section */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12 text-star-white"
        >
          Explore Our Destinations
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ALL_DESTINATIONS.map((dest, index) => (
            <motion.div
              key={dest.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
            >
              <Link to={`/destinations/${dest.slug}`} className="block h-full">
                <div className={`glass-card p-5 h-full hover:bg-white/10 transition-all duration-300 border ${dest.borderAccent}`}>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-3 ${dest.bgAccent} ${dest.accentColor} border ${dest.borderAccent}`}>
                    Destination
                  </span>
                  <h3 className="text-lg font-bold text-star-white mb-1">{dest.name}</h3>
                  <p className="text-star-white/60 text-sm leading-snug">{dest.tagline}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="glass-card p-12 text-center bg-cosmic-gradient"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready for Your Space Adventure?
        </h2>
        <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of space travelers who have already booked their
          journey to the stars. Your adventure awaits!
        </p>
        <Link to="/flights">
          <Button variant="secondary" size="lg">
            Book Your Flight Now
          </Button>
        </Link>
      </motion.section>

      <UserIdentification isOpen={showUserModal} onClose={() => setShowUserModal(false)} onSuccess={() => setShowBookingModal(true)} />
      <BookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} flight={selectedFlight} onSuccess={loadFlights} />
    </div>
  );
};

// Made with Bob
