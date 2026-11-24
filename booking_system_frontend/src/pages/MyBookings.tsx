import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Booking, Flight, StoredHold, ErrorResponse } from '../types';
import { LoadingSpinner, Modal, Button, PlanetOrb } from '../components/common';
import { BookingCard } from '../components/bookings/BookingCard';
import { HoldCard } from '../components/bookings/HoldCard';
import { getUserBookings, getFlights, cancelBooking, getHold, isErrorResponse } from '../services/api';
import { getStoredHolds, removeHold } from '../utils/holdStorage';
import { useUser } from '../hooks/useUserContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const MyBookings = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [activeHolds, setActiveHolds] = useState<StoredHold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);

  const loadHolds = useCallback(async () => {
    if (!user) return;

    const stored = getStoredHolds(user.user_id);
    if (stored.length === 0) {
      setActiveHolds([]);
      return;
    }

    // Verify each hold's current status from the API, remove stale ones
    const stillActive: StoredHold[] = [];
    const isLocallyExpired = (sh: StoredHold) => {
      const expiryTime = new Date(sh.reservedUntil).getTime();
      return isNaN(expiryTime) || expiryTime < Date.now();
    };
    await Promise.all(
      stored.map(async (sh) => {
        try {
          const hold = await getHold(sh.holdId);
          if (hold.status === 'HELD' && !isLocallyExpired(sh)) {
            stillActive.push(sh);
          } else {
            // Hold is no longer active (confirmed, released, expired, or locally timed out)
            removeHold(user.user_id, sh.holdId);
          }
        } catch {
          // API unavailable — fall back to local expiry check
          if (!isLocallyExpired(sh)) {
            stillActive.push(sh);
          } else {
            removeHold(user.user_id, sh.holdId);
          }
        }
      })
    );

    setActiveHolds(stillActive);
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [bookingsData, flightsData] = await Promise.all([
        getUserBookings(user.user_id),
        getFlights(),
      ]);
      setBookings(bookingsData);
      setFlights(flightsData);
      await loadHolds();
    } catch (err) {
      toast.error('Failed to load bookings');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadHolds]);

  useEffect(() => {
    if (!user) {
      navigate('/flights');
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  const handleCancelClick = (bookingId: number) => {
    setBookingToCancel(bookingId);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    setCancellingId(bookingToCancel);
    setShowCancelModal(false);

    try {
      const result = await cancelBooking(bookingToCancel);

      if (isErrorResponse(result)) {
        toast.error(result.details || result.error);
        return;
      }

      toast.success('Booking cancelled successfully');
      loadData();
    } catch (err) {
      const error = err as ErrorResponse;
      toast.error(error.details || error.error || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
      setBookingToCancel(null);
    }
  };

  const getFlightForBooking = (booking: Booking): Flight | undefined => {
    return flights.find((f) => f.flight_id === booking.flight_id);
  };

  const getFlightForHold = (hold: StoredHold): Flight | undefined => {
    return flights.find((f) => f.flight_id === hold.flightId);
  };

  const activeBookings = bookings.filter((b) => b.status === 'booked');
  const pastBookings = bookings.filter((b) => b.status !== 'booked');

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow mb-3">Passenger · {user.name}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-star-white md:text-5xl">My Bookings</h1>
        <p className="mt-3 max-w-xl text-star-white/55">Your boarding passes, and any seats you are holding.</p>
      </motion.div>

      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading your bookings..." />
      ) : (
        <div className="space-y-8">
          {/* Pending Holds */}
          {activeHolds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <h2 className="eyebrow mb-4">
                Pending holds · {activeHolds.length} · Confirm before time runs out
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeHolds.map((hold) => (
                  <HoldCard
                    key={hold.holdId}
                    storedHold={hold}
                    flight={getFlightForHold(hold)}
                    onAction={loadData}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* No content at all */}
          {bookings.length === 0 && activeHolds.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="panel flex flex-col items-center px-6 py-16 text-center"
            >
              <PlanetOrb name="Earth" size={72} className="mb-6" />
              <p className="eyebrow mb-3">No bookings yet</p>
              <p className="mb-6 text-star-white/70">You are still on Earth. Pick a departure to change that.</p>
              <Button onClick={() => navigate('/flights')}>Browse flights</Button>
            </motion.div>
          )}

          {/* Active Bookings */}
          {activeBookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="eyebrow mb-4">Active bookings · {activeBookings.length}</h2>
              <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                {activeBookings.map((booking) => (
                  <BookingCard
                    key={booking.booking_id}
                    booking={booking}
                    flight={getFlightForBooking(booking)}
                    onCancel={handleCancelClick}
                    isCancelling={cancellingId === booking.booking_id}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="eyebrow mb-4">Past bookings · {pastBookings.length}</h2>
              <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                {pastBookings.map((booking) => (
                  <BookingCard
                    key={booking.booking_id}
                    booking={booking}
                    flight={getFlightForBooking(booking)}
                    onCancel={handleCancelClick}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Booking"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-star-white/70">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel}>
              Cancel booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Made with Bob
