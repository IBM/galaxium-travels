import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import type { Flight, ErrorResponse } from '../types';
import { LoadingSpinner } from '../components/common';
import { FlightCard } from '../components/flights/FlightCard';
import { FlightFilters } from '../components/flights/FlightFilters';
import { UserIdentification } from '../components/user/UserIdentification';
import { BookingModal } from '../components/bookings/BookingModal';
import { getFlights } from '../services/api';
import type { FlightFilters as FlightFiltersType } from '../services/api';
import { useUser } from '../hooks/useUserContext';
import { Search, Orbit, List } from 'lucide-react';
import { MapErrorBoundary } from '../components/solar/MapErrorBoundary';
import { isWebGLAvailable } from '../solar/webgl';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Lazy, so three.js is only downloaded when the map is opened.
const SolarSystemMap = lazy(() => import('../components/solar/SolarSystemMap'));

type ViewMode = 'map' | 'list';

export const Flights = () => {
  const { user } = useUser();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FlightFiltersType>({});
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  // The map is the default view. Without WebGL, or if the scene throws, the list takes over.
  const [mapAvailable, setMapAvailable] = useState(isWebGLAvailable);
  const [view, setView] = useState<ViewMode>(() => (mapAvailable ? 'map' : 'list'));

  const handleMapError = useCallback(() => {
    setMapAvailable(false);
    setView('list');
    toast.error('The 3D map is unavailable. Showing the list view.');
  }, []);

  const loadFlights = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    setIsLoading(true);
    try {
      const data = await getFlights(filters);
      setFlights(data);
    } catch (err) {
      const error = err as ErrorResponse;
      if (retryCount < MAX_RETRIES) {
        toast.error(`Failed to load flights. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        console.warn(`Retry attempt ${retryCount + 1} after error:`, error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        
        // Retry with incremented count
        return loadFlights(retryCount + 1);
      } else {
        toast.error('Failed to load flights after multiple attempts');
        console.error('Max retries reached:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Fetch flights when filters change
  useEffect(() => {
    loadFlights();
  }, [loadFlights]);

  const handleBookFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    
    if (!user) {
      // Show user identification modal first
      setShowUserModal(true);
    } else {
      // Show booking confirmation modal
      setShowBookingModal(true);
    }
  };

  const handleUserIdentified = () => {
    // After user signs in, show booking modal
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    // Reload flights to get updated seat availability
    loadFlights();
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  // Client-side search filter (applied after backend filters)
  const displayFlights = searchTerm.trim()
    ? flights.filter(
        (flight) =>
          flight.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
          flight.destination.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : flights;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-star-white mb-4">
          Available <span className="bg-cosmic-gradient bg-clip-text text-transparent">Flights</span>
        </h1>
        <p className="text-star-white/70 text-lg">
          Choose your destination and embark on an interplanetary adventure
        </p>
      </motion.div>

      {/* View toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1" role="group" aria-label="Flight view">
          {([
            { mode: 'map', label: 'Map', Icon: Orbit },
            { mode: 'list', label: 'List', Icon: List },
          ] as const).map(({ mode, label, Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              disabled={mode === 'map' && !mapAvailable}
              title={mode === 'map' && !mapAvailable ? '3D map is not available in this browser' : undefined}
              aria-pressed={view === mode}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                view === mode ? 'bg-cosmic-purple text-white' : 'text-star-white/70 hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Solar system map. Stays mounted while flights refetch so the clock and camera are kept. */}
      {view === 'map' && (
        <MapErrorBoundary onError={handleMapError}>
          <Suspense fallback={<LoadingSpinner size="lg" text="Loading solar system..." />}>
            <SolarSystemMap flights={displayFlights} onBookFlight={handleBookFlight} />
          </Suspense>
        </MapErrorBoundary>
      )}

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-star-white/50" size={20} />
          <input
            type="text"
            placeholder="Search by origin or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-star-white placeholder-star-white/50 focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
          />
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <FlightFilters filters={filters} onFiltersChange={setFilters} onReset={handleResetFilters} />
      </motion.div>

      {/* Results Count */}
      <div className="text-center text-star-white/70">
        Showing {displayFlights.length} flight{displayFlights.length !== 1 ? 's' : ''}
      </div>

      {/* Flights Grid */}
      {view === 'map' ? null : isLoading ? (
        <LoadingSpinner size="lg" text="Loading flights..." />
      ) : displayFlights.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-star-white/70 text-lg">
            No flights found matching your criteria
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {displayFlights.map((flight) => (
            <FlightCard
              key={flight.flight_id}
              flight={flight}
              onBook={handleBookFlight}
            />
          ))}
        </motion.div>
      )}

      {/* User Identification Modal */}
      <UserIdentification
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSuccess={handleUserIdentified}
      />

      {/* Booking Confirmation Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        flight={selectedFlight}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
};

// Made with Bob