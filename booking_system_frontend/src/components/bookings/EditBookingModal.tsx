import { useState, useEffect } from 'react';
import type { Booking, Flight } from '../../types';
import { Modal, Button, Input } from '../common';
import { Users, Baby, Edit } from 'lucide-react';
import { updateBooking, isErrorResponse } from '../../services/api';
import toast from 'react-hot-toast';

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  flight?: Flight;
  onSuccess: () => void;
}

export const EditBookingModal = ({ 
  isOpen, 
  onClose, 
  booking, 
  flight,
  onSuccess 
}: EditBookingModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [numAdults, setNumAdults] = useState(1);
  const [numInfants, setNumInfants] = useState(0);
  const [passengerNames, setPassengerNames] = useState('');

  // Initialize form with booking data
  useEffect(() => {
    if (booking) {
      setNumAdults(booking.num_adults);
      setNumInfants(booking.num_infants);
      setPassengerNames(booking.passenger_names || '');
    }
  }, [booking]);

  if (!booking) return null;

  const totalSeatsNeeded = numAdults;
  const currentSeatsUsed = booking.num_adults;
  const seatDifference = totalSeatsNeeded - currentSeatsUsed;
  const availableSeats = flight?.seats_available || 0;

  const handleUpdateBooking = async () => {
    if (numAdults < 1) {
      toast.error('At least one adult passenger is required');
      return;
    }

    if (seatDifference > availableSeats) {
      toast.error(`Only ${availableSeats} additional seats available`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateBooking(booking.booking_id, {
        num_adults: numAdults,
        num_infants: numInfants,
        passenger_names: passengerNames || undefined,
      });

      if (isErrorResponse(result)) {
        toast.error(result.details || result.error);
        return;
      }

      toast.success('Booking updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.details || error.error || 'Failed to update booking');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Your Booking"
      size="md"
    >
      <div className="space-y-6">
        {/* Booking Info */}
        <div className="glass-card p-4 bg-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-cosmic-gradient">
              <Edit className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-star-white">
                Booking #{booking.booking_id}
              </h3>
              {flight && (
                <p className="text-sm text-star-white/60">
                  {flight.origin} → {flight.destination}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current vs New */}
        <div className="glass-card p-4 bg-white/5">
          <h4 className="text-sm font-semibold text-star-white mb-3">
            Current Booking
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-star-white/60">Adults:</span>
              <span className="text-star-white">{booking.num_adults}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-star-white/60">Infants:</span>
              <span className="text-star-white">{booking.num_infants}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-star-white/60">Seats used:</span>
              <span className="text-star-white">{booking.num_adults}</span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="glass-card p-4 bg-white/5 space-y-4">
          <h4 className="text-sm font-semibold text-star-white mb-2">
            Update Passenger Details
          </h4>

          {/* Number of Adults */}
          <div>
            <label className="block text-sm text-star-white/80 mb-2">
              <Users className="inline mr-2" size={16} />
              Number of Adults
            </label>
            <Input
              type="number"
              min="1"
              max={currentSeatsUsed + availableSeats}
              value={numAdults}
              onChange={(e) => setNumAdults(parseInt(e.target.value) || 1)}
              className="w-full"
            />
            {seatDifference > 0 && (
              <p className="text-xs text-star-white/60 mt-1">
                +{seatDifference} additional seat{seatDifference !== 1 ? 's' : ''} needed
              </p>
            )}
            {seatDifference < 0 && (
              <p className="text-xs text-alien-green mt-1">
                {Math.abs(seatDifference)} seat{Math.abs(seatDifference) !== 1 ? 's' : ''} will be released
              </p>
            )}
          </div>

          {/* Number of Infants */}
          <div>
            <label className="block text-sm text-star-white/80 mb-2">
              <Baby className="inline mr-2" size={16} />
              Number of Infants (under 2 years)
            </label>
            <Input
              type="number"
              min="0"
              max="10"
              value={numInfants}
              onChange={(e) => setNumInfants(parseInt(e.target.value) || 0)}
              className="w-full"
            />
            <p className="text-xs text-star-white/60 mt-1">
              Infants travel on lap, no seat required
            </p>
          </div>

          {/* Passenger Names */}
          <div>
            <label className="block text-sm text-star-white/80 mb-2">
              Passenger Names (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g., John Doe, Jane Smith, Baby Smith"
              value={passengerNames}
              onChange={(e) => setPassengerNames(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-star-white/60 mt-1">
              Comma-separated list of all passenger names
            </p>
          </div>
        </div>

        {/* Seat Availability Warning */}
        {flight && seatDifference > 0 && (
          <div className="glass-card p-3 bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm text-yellow-200">
              ⚠️ Available seats: {availableSeats}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateBooking}
            isLoading={isLoading}
            className="flex-1"
          >
            Update Booking
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Made with Bob