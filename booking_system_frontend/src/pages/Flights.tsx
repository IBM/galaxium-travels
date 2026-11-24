import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Flight, ErrorResponse, SeatClass } from '../types';
import { Button } from '../components/common';
import { FlightBoard } from '../components/flights/FlightBoard';
import { FlightFilters } from '../components/flights/FlightFilters';
import { UserIdentification } from '../components/user/UserIdentification';
import { BookingModal } from '../components/bookings/BookingModal';
import { getFlights } from '../services/api';
import type { FlightFilters as FlightFiltersType } from '../services/api';
import { useUser } from '../hooks/useUserContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const Flights = () => {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // Destination pages link here with ?destination=Mars.
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('destination') ?? '');
  const [filters, setFilters] = useState<FlightFiltersType>({});
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedClass, setSelectedClass] = useState<SeatClass>('economy');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const loadFlights = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    setIsLoading(true);
    setLoadFailed(false);
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
        setLoadFailed(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Fetch flights when filters change
  useEffect(() => {
    loadFlights();
  }, [loadFlights]);

  const handleBookFlight = (flight: Flight, seatClass: SeatClass) => {
    setSelectedFlight(flight);
    setSelectedClass(seatClass);
    
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

  const isEmpty = !isLoading && displayFlights.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-3" aria-live="polite">
          Departures
          {!isLoading && ` · ${displayFlights.length} flight${displayFlights.length !== 1 ? 's' : ''}`}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-star-white md:text-5xl">Flights</h1>
        <p className="mt-3 max-w-xl text-star-white/55">Pick a departure to see its cabin classes, then hold a seat while you decide.</p>
      </motion.div>

      {/* Search and filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <FlightFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </motion.div>

      {/* Departure board */}
      {isEmpty ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel px-6 py-16 text-center">
          <p className="eyebrow mb-3">{loadFailed ? 'Schedule unavailable' : 'No departures'}</p>
          <p className="mb-6 text-star-white/70">
            {loadFailed ? 'The flight schedule could not be loaded.' : 'No flights match your search and filters.'}
          </p>
          {loadFailed ? (
            <Button variant="secondary" onClick={() => loadFlights()}>
              Try again
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleResetFilters}>
              Reset filters
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <FlightBoard flights={displayFlights} isLoading={isLoading} onBook={handleBookFlight} />
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
        initialClass={selectedClass}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
};

// Made with Bob
