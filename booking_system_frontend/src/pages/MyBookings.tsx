import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Booking, Flight, StoredHold, ErrorResponse, CancellationPreview } from '../types';
import { LoadingSpinner, Modal, Button } from '../components/common';
import { BookingCard } from '../components/bookings/BookingCard';
import { HoldCard } from '../components/bookings/HoldCard';
import { getUserBookings, getFlights, cancelBooking, getHold, getCancellationPreview, isErrorResponse } from '../services/api';
import { getStoredHolds, removeHold } from '../utils/holdStorage';
import { useUser } from '../hooks/useUserContext';
import { AlertCircle, RefreshCcw, Banknote, Receipt, Star } from 'lucide-react';
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
  const [cancelPreview, setCancelPreview] = useState<CancellationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    setCancelPreview(null);
    setPreviewError(null);
    setShowCancelModal(true);

    // Fetch preview in parallel with modal open — don't block the click
    setPreviewLoading(true);
    getCancellationPreview(bookingId)
      .then((result) => {
        if (isErrorResponse(result)) {
          setPreviewError(result.details || result.error);
        } else {
          setCancelPreview(result);
        }
      })
      .catch(() => setPreviewError('Unable to load refund preview.'))
      .finally(() => setPreviewLoading(false));
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    setCancellingId(bookingToCancel);
    setShowCancelModal(false);
    setCancelPreview(null);
    setPreviewError(null);

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-star-white mb-4">
          My <span className="bg-cosmic-gradient bg-clip-text text-transparent">Bookings</span>
        </h1>
        <p className="text-star-white/70 text-lg">
          Manage your space travel reservations
        </p>
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
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-solar-orange">
                  Pending Holds ({activeHolds.length})
                </h2>
                <span className="text-xs text-star-white/50 bg-solar-orange/10 border border-solar-orange/30 px-2 py-1 rounded-full">
                  Confirm before time runs out
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className="glass-card p-12 text-center"
            >
              <AlertCircle className="mx-auto mb-4 text-star-white/50" size={48} />
              <h3 className="text-xl font-semibold text-star-white mb-2">
                No bookings yet
              </h3>
              <p className="text-star-white/70 mb-6">
                Start your space adventure by booking your first flight!
              </p>
              <Button onClick={() => navigate('/flights')}>Browse Flights</Button>
            </motion.div>
          )}

          {/* Active Bookings */}
          {activeBookings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-star-white mb-4">
                Active Bookings ({activeBookings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <h2 className="text-2xl font-bold text-star-white mb-4">
                Past Bookings ({pastBookings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        onClose={() => { setShowCancelModal(false); setCancelPreview(null); setPreviewError(null); }}
        title="Cancel Booking"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-star-white/70">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>

          {/* Refund preview */}
          {previewLoading && (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-star-white/10 rounded w-3/4" />
              <div className="h-4 bg-star-white/10 rounded w-1/2" />
              <div className="h-4 bg-star-white/10 rounded w-2/3" />
            </div>
          )}

          {!previewLoading && previewError && (
            <p className="text-solar-orange/80 text-sm">{previewError}</p>
          )}

          {!previewLoading && cancelPreview && (
            <div className="rounded-lg border border-star-white/10 bg-space-blue/40 p-4 space-y-3">
              <p className="text-xs text-star-white/50 uppercase tracking-wider">Refund breakdown</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-star-white/70">
                    <Banknote size={14} className="text-alien-green" />
                    Refund to payment method
                  </span>
                  <span className="font-semibold text-alien-green">
                    {cancelPreview.refund_amount.toLocaleString()} cr
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-star-white/70">
                    <Receipt size={14} className="text-nebula-pink" />
                    Cancellation fee
                  </span>
                  <span className="font-semibold text-nebula-pink">
                    {cancelPreview.cancellation_fee.toLocaleString()} cr
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-star-white/70">
                    <Star size={14} className="text-solar-orange" />
                    Travel credit issued
                  </span>
                  <span className="font-semibold text-solar-orange">
                    {cancelPreview.travel_credit.toLocaleString()} cr
                  </span>
                </div>
              </div>
              {cancelPreview.policy_tier === 'no_refund' && (
                <p className="text-xs text-star-white/50 pt-1">
                  Flights departing within 2 days are non-refundable. No credit or fee applies.
                </p>
              )}
              {cancelPreview.policy_tier !== 'no_refund' && (
                <p className="text-xs text-star-white/50 pt-1">
                  Based on {cancelPreview.days_to_departure} day{cancelPreview.days_to_departure !== 1 ? 's' : ''} to departure.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setShowCancelModal(false); setCancelPreview(null); setPreviewError(null); }}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} className="flex-1">
              <RefreshCcw size={14} className="mr-1 inline" />
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Made with Bob
