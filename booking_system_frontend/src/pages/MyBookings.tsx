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

  const handleCancelClick = async (bookingId: number) => {
    // Open modal immediately (loading-first UX)
    setBookingToCancel(bookingId);
    setCancelPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setShowCancelModal(true);

    try {
      const preview = await getCancellationPreview(bookingId);
      setCancelPreview(preview);
    } catch {
      setPreviewError('Could not load cancellation preview. You can still cancel.');
    } finally {
      setPreviewLoading(false);
    }
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
        size="md"
      >
        <div className="space-y-5">
          {/* Loading state */}
          {previewLoading && (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="sm" text="Calculating refund…" />
            </div>
          )}

          {/* Preview error — non-blocking */}
          {previewError && !previewLoading && (
            <p className="text-yellow-400 text-sm">{previewError}</p>
          )}

          {/* Refund breakdown */}
          {cancelPreview && !previewLoading && (
            <div className="space-y-4">
              {/* Tier badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${
                    cancelPreview.cancellation_tier === 'full_refund'
                      ? 'text-alien-green border-alien-green/40 bg-alien-green/10'
                      : cancelPreview.cancellation_tier === 'partial_refund'
                      ? 'text-solar-orange border-solar-orange/40 bg-solar-orange/10'
                      : cancelPreview.cancellation_tier === 'fee_only'
                      ? 'text-nebula-pink border-nebula-pink/40 bg-nebula-pink/10'
                      : 'text-red-500 border-red-500/40 bg-red-500/10'
                  }`}
                >
                  {cancelPreview.cancellation_tier === 'full_refund' && 'Full Refund'}
                  {cancelPreview.cancellation_tier === 'partial_refund' && 'Partial Refund'}
                  {cancelPreview.cancellation_tier === 'fee_only' && 'Fee + Credit'}
                  {cancelPreview.cancellation_tier === 'forfeit' && 'Total Forfeit'}
                </span>
                {cancelPreview.days_until_departure !== null && (
                  <span className="text-star-white/50 text-xs">
                    {cancelPreview.days_until_departure} day{cancelPreview.days_until_departure !== 1 ? 's' : ''} until departure
                  </span>
                )}
              </div>

              {/* Segmented bar — only render when at least one pct > 0 */}
              {(cancelPreview.refund_pct > 0 || cancelPreview.fee_pct > 0 || cancelPreview.credit_pct > 0) ? (
                <div className="flex rounded-lg overflow-hidden h-3 w-full bg-white/10">
                  {cancelPreview.refund_pct > 0 && (
                    <div
                      className="bg-alien-green transition-all"
                      style={{ width: `${cancelPreview.refund_pct * 100}%` }}
                      title={`Refund ${Math.round(cancelPreview.refund_pct * 100)}%`}
                    />
                  )}
                  {cancelPreview.fee_pct > 0 && (
                    <div
                      className="bg-nebula-pink transition-all"
                      style={{ width: `${cancelPreview.fee_pct * 100}%` }}
                      title={`Fee ${Math.round(cancelPreview.fee_pct * 100)}%`}
                    />
                  )}
                  {cancelPreview.credit_pct > 0 && (
                    <div
                      className="bg-solar-orange transition-all"
                      style={{ width: `${cancelPreview.credit_pct * 100}%` }}
                      title={`Credit ${Math.round(cancelPreview.credit_pct * 100)}%`}
                    />
                  )}
                </div>
              ) : (
                /* Same-day forfeit: single full-width grey band */
                <div className="flex rounded-lg overflow-hidden h-3 w-full">
                  <div className="bg-white/20 w-full" title="Total forfeit" />
                </div>
              )}

              {/* Legend */}
              <div className="flex gap-2 text-xs text-star-white/60">
                {cancelPreview.refund_pct > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-alien-green inline-block" /> Refund</span>}
                {cancelPreview.fee_pct > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-nebula-pink inline-block" /> Fee</span>}
                {cancelPreview.credit_pct > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-solar-orange inline-block" /> Credit</span>}
                {cancelPreview.cancellation_tier === 'forfeit' && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white/20 inline-block" /> Forfeited</span>}
              </div>

              {/* Line items */}
              <div className="divide-y divide-white/10 text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-star-white/70">Ticket price</span>
                  <span className="text-star-white font-medium">
                    ${cancelPreview.price_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {cancelPreview.refund_amount > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-alien-green">Refund</span>
                    <span className="text-alien-green font-medium">
                      +${cancelPreview.refund_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {cancelPreview.cancellation_fee > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-nebula-pink">Cancellation fee</span>
                    <span className="text-nebula-pink font-medium">
                      −${cancelPreview.cancellation_fee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {cancelPreview.travel_credit > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-solar-orange">Travel credit</span>
                    <span className="text-solar-orange font-medium">
                      ${cancelPreview.travel_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {cancelPreview.cancellation_tier === 'forfeit' && (
                  <div className="flex justify-between py-2">
                    <span className="text-red-500">Forfeited (same-day)</span>
                    <span className="text-red-500 font-medium">
                      −${cancelPreview.price_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fallback message when preview not yet loaded and no error */}
          {!cancelPreview && !previewLoading && !previewError && (
            <p className="text-star-white/70 text-sm">
              Are you sure you want to cancel this booking?
            </p>
          )}

          <p className="text-star-white/50 text-xs">This action cannot be undone.</p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setShowCancelModal(false); setCancelPreview(null); setPreviewError(null); }}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} className="flex-1" disabled={previewLoading}>
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Made with Bob
