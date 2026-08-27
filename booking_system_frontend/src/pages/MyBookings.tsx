import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Booking, Flight, StoredHold, ErrorResponse, CancellationPreview } from '../types';
import { LoadingSpinner, Modal, Button } from '../components/common';
import { BookingCard } from '../components/bookings/BookingCard';
import { HoldCard } from '../components/bookings/HoldCard';
import { getUserBookings, getFlights, cancelBooking, getHold, isErrorResponse, getCancellationPreview } from '../services/api';
import { getStoredHolds, removeHold } from '../utils/holdStorage';
import { useUser } from '../hooks/useUserContext';
import { AlertCircle, ArrowLeftCircle, XCircle, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/formatters';

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

  const handleCancelClick = (bookingId: number) => {
    setBookingToCancel(bookingId);
    setCancellationPreview(null);
    setShowCancelModal(true);
    setPreviewLoading(true);

    let retried = false;
    const fetchPreview = () => {
      getCancellationPreview(bookingId)
        .then((preview) => {
          setCancellationPreview(preview);
          setPreviewLoading(false);
        })
        .catch(() => {
          if (!retried) {
            retried = true;
            setTimeout(fetchPreview, 2000);
          } else {
            setPreviewLoading(false);
          }
        });
    };
    fetchPreview();
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    setCancellingId(bookingToCancel);
    setShowCancelModal(false);
    setCancellationPreview(null);
    setPreviewLoading(false);

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
        onClose={() => {
          setShowCancelModal(false);
          setCancellationPreview(null);
          setPreviewLoading(false);
        }}
        title="Cancel Booking"
        size="md"
      >
        <div className="space-y-5">
          {previewLoading && (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="sm" text="Calculating your refund…" />
            </div>
          )}

          {!previewLoading && cancellationPreview && (
            <>
              {/* Tier badge */}
              <div className="flex items-center gap-2">
                {cancellationPreview.tier_label === 'Non-refundable' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-nebula-pink/20 text-nebula-pink border border-nebula-pink/40">
                    <XCircle size={14} />
                    {cancellationPreview.tier_label}
                  </span>
                ) : cancellationPreview.tier_label === 'Full Refund' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-alien-green/20 text-alien-green border border-alien-green/40">
                    <ArrowLeftCircle size={14} />
                    {cancellationPreview.tier_label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-solar-orange/20 text-solar-orange border border-solar-orange/40">
                    <ArrowLeftCircle size={14} />
                    {cancellationPreview.tier_label}
                  </span>
                )}
                <span className="text-star-white/50 text-sm">
                  {cancellationPreview.days_to_departure === 0
                    ? 'Departing today'
                    : `${cancellationPreview.days_to_departure} day${cancellationPreview.days_to_departure === 1 ? '' : 's'} to departure`}
                </span>
              </div>

              {/* Same-day non-refundable banner */}
              {cancellationPreview.tier_label === 'Non-refundable' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-nebula-pink/10 border border-nebula-pink/30 text-nebula-pink text-sm">
                  <XCircle size={16} className="shrink-0" />
                  <span>This booking is <strong>non-refundable</strong>. No cash or credit will be returned.</span>
                </div>
              )}

              {/* Line items */}
              <div className="rounded-lg border border-star-white/10 divide-y divide-star-white/10">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-star-white/70 text-sm">
                    <ArrowLeftCircle size={15} className="text-alien-green" />
                    Cash refund
                  </div>
                  <span className="text-star-white font-medium text-sm">
                    {formatCurrency(cancellationPreview.refund_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-star-white/70 text-sm">
                    <XCircle size={15} className="text-nebula-pink" />
                    Cancellation fee
                  </div>
                  <span className="text-nebula-pink font-medium text-sm">
                    -{formatCurrency(cancellationPreview.fee_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-star-white/70 text-sm">
                    <Ticket size={15} className="text-solar-orange" />
                    Travel credit
                  </div>
                  <span className="text-solar-orange font-medium text-sm">
                    {formatCurrency(cancellationPreview.credit_amount)}
                  </span>
                </div>
              </div>

              {/* Proportion bar (hidden when all zero) */}
              {(cancellationPreview.refund_amount > 0 || cancellationPreview.fee_amount > 0 || cancellationPreview.credit_amount > 0) && (
                <div className="flex h-2 rounded-full overflow-hidden gap-px">
                  {cancellationPreview.refund_amount > 0 && (
                    <div
                      className="bg-alien-green"
                      style={{ flex: cancellationPreview.refund_amount }}
                    />
                  )}
                  {cancellationPreview.fee_amount > 0 && (
                    <div
                      className="bg-nebula-pink"
                      style={{ flex: cancellationPreview.fee_amount }}
                    />
                  )}
                  {cancellationPreview.credit_amount > 0 && (
                    <div
                      className="bg-solar-orange"
                      style={{ flex: cancellationPreview.credit_amount }}
                    />
                  )}
                </div>
              )}

              {/* Net summary */}
              <div className="flex items-center justify-between pt-1 border-t border-star-white/10">
                <span className="text-star-white/70 text-sm">You'll receive back</span>
                <span className="text-star-white font-bold text-lg">
                  {formatCurrency(cancellationPreview.refund_amount)}
                </span>
              </div>
            </>
          )}

          {/* Fallback copy when preview failed to load */}
          {!previewLoading && !cancellationPreview && (
            <p className="text-star-white/70 text-sm">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCancelModal(false);
                setCancellationPreview(null);
                setPreviewLoading(false);
              }}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              className="flex-1"
              disabled={previewLoading}
            >
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Made with Bob
