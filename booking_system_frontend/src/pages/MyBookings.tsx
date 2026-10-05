import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Booking, Flight, StoredHold, ErrorResponse, CancellationPreview } from '../types';
import { LoadingSpinner, Modal, Button } from '../components/common';
import { BookingCard } from '../components/bookings/BookingCard';
import { HoldCard } from '../components/bookings/HoldCard';
import { getUserBookings, getFlights, cancelBooking, getCancellationPreview, getHold, isErrorResponse } from '../services/api';
import { getStoredHolds, removeHold } from '../utils/holdStorage';
import { useUser } from '../hooks/useUserContext';
import { AlertCircle } from 'lucide-react';
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
  const [cancellationPreview, setCancellationPreview] = useState<CancellationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const handleCancelClick = async (bookingId: number) => {
    setBookingToCancel(bookingId);
    setCancellationPreview(null);
    setShowCancelModal(true);
    setPreviewLoading(true);
    try {
      const preview = await getCancellationPreview(bookingId);
      setCancellationPreview(preview);
    } catch {
      // Preview unavailable — modal still opens, just without the breakdown
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    setCancellingId(bookingToCancel);
    setShowCancelModal(false);
    setCancellationPreview(null);

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
        onClose={() => { setShowCancelModal(false); setCancellationPreview(null); }}
        title="Cancel Booking"
        size="md"
      >
        <div className="space-y-5">
          <p className="text-star-white/70">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>

          {/* Refund preview section */}
          {previewLoading && (
            <div className="text-star-white/50 text-sm text-center py-2">
              Loading refund breakdown…
            </div>
          )}

          {cancellationPreview && !previewLoading && (
            <div className="space-y-3 bg-white/5 border border-cosmic-purple/20 rounded-xl p-4">
              {/* Tier badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-star-white/50">
                  Cancellation policy
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-full border border-cosmic-purple/30 text-cosmic-purple">
                  {cancellationPreview.tier_label}
                </span>
              </div>

              {/* Proportion bar */}
              <div className="w-full h-3 rounded-full overflow-hidden flex">
                {cancellationPreview.refund_pct > 0 && (
                  <div
                    className="bg-alien-green h-full"
                    style={{ width: `${cancellationPreview.refund_pct * 100}%` }}
                  />
                )}
                {cancellationPreview.credit_pct > 0 && (
                  <div
                    className="bg-solar-orange h-full"
                    style={{ width: `${cancellationPreview.credit_pct * 100}%` }}
                  />
                )}
                {cancellationPreview.fee_pct > 0 && (
                  <div
                    className="bg-nebula-pink h-full"
                    style={{ width: `${cancellationPreview.fee_pct * 100}%` }}
                  />
                )}
              </div>

              {/* Line items */}
              <div className="space-y-1 text-sm">
                {cancellationPreview.refund_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-alien-green">Cash refund</span>
                    <span className="text-alien-green font-semibold">
                      {cancellationPreview.refund_amount.toLocaleString()} cr
                    </span>
                  </div>
                )}
                {cancellationPreview.credit_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-solar-orange">Travel credit</span>
                    <span className="text-solar-orange font-semibold">
                      {cancellationPreview.credit_amount.toLocaleString()} cr
                    </span>
                  </div>
                )}
                {cancellationPreview.fee_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-nebula-pink">Cancellation fee</span>
                    <span className="text-nebula-pink font-semibold">
                      −{cancellationPreview.fee_amount.toLocaleString()} cr
                    </span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="flex justify-between pt-2 border-t border-cosmic-purple/20 text-sm font-semibold">
                <span className="text-star-white/70">You'll receive back</span>
                <span className="text-alien-green">
                  {(cancellationPreview.refund_amount + cancellationPreview.credit_amount).toLocaleString()} cr
                </span>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-star-white/40 italic text-center pt-1">
                Preview only — no payment is processed until you confirm.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setShowCancelModal(false); setCancellationPreview(null); }}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} className="flex-1">
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Made with Bob
