import { useState, useEffect } from 'react';
import type { Flight } from '../types';
import { LoadingSpinner } from '../components/common';
import { FlightCard } from '../components/flights/FlightCard';
import { FlightFilters } from '../components/flights/FlightFilters';
import { UserIdentification } from '../components/user/UserIdentification';
import { BookingModal } from '../components/bookings/BookingModal';
import { getFlights } from '../services/api';
import type { FlightFilters as FlightFiltersType } from '../services/api';
import { useUser } from '../hooks/useUser';
import { Search } from '@carbon/icons-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const Flights = () => {
  const { user } = useUser();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FlightFiltersType>({});
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Fetch flights when filters change
  useEffect(() => {
    loadFlights();
  }, [filters]);

  const loadFlights = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    setIsLoading(true);
    try {
      const data = await getFlights(filters);
      setFlights(data);
    } catch (error: any) {
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
  };

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
        <h1 className="text-4xl md:text-5xl font-bold text-text-01 mb-4">
          Available <span className="text-interactive-01">Flights</span>
        </h1>
        <p className="text-text-02 text-lg">
          Choose your destination and embark on an interplanetary adventure
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="carbon-card p-6"
      >
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-icon-02">
            <Search size={20} />
          </div>
          <input
            type="text"
            id="search"
            placeholder="Search by origin or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-field-01 border-b-2 border-ui-04 rounded-none pl-12 pr-4 py-3 text-text-01 placeholder-text-03 focus:outline-none focus:border-focus transition-colors duration-200"
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
      <div className="text-center text-text-02">
        Showing {displayFlights.length} flight{displayFlights.length !== 1 ? 's' : ''}
      </div>

      {/* Flights Grid */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading flights..." />
      ) : displayFlights.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-text-02 text-lg">
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