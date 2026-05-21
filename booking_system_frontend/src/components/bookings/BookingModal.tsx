import { useState } from 'react';
import type { Flight } from '../../types';
import { Modal, Button, Input } from '../common';
import { Plane, Calendar, Clock, DollarSign, Users, Baby } from 'lucide-react';
import { formatCurrency, formatDate, calculateDuration } from '../../utils/formatters';
import { bookFlight, isErrorResponse } from '../../services/api';
import { useUser } from '../../hooks/useUser';
import toast from 'react-hot-toast';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  onSuccess: () => void;
}

export const BookingModal = ({ isOpen, onClose, flight, onSuccess }: BookingModalProps) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [numAdults, setNumAdults] = useState(1);
  const [numInfants, setNumInfants] = useState(0);
  const [passengerNames, setPassengerNames] = useState('');

  if (!flight) return null;

  const totalSeatsNeeded = numAdults;
  const totalPrice = flight.price * numAdults;

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error('Please sign in to book a flight');
      return;
    }

    if (numAdults < 1) {
      toast.error('At least one adult passenger is required');
      return;
    }

    if (totalSeatsNeeded > flight.seats_available) {
      toast.error(`Only ${flight.seats_available} seats available`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await bookFlight({
        user_id: user.user_id,
        name: user.name,
        flight_id: flight.flight_id,
        num_adults: numAdults,
        num_infants: numInfants,
        passenger_names: passengerNames || undefined,
      });

      if (isErrorResponse(result)) {
        toast.error(result.details || result.error);
        return;
      }

      toast.success('Flight booked successfully!');
      onSuccess();
      onClose();
      // Reset form
      setNumAdults(1);
      setNumInfants(0);
      setPassengerNames('');
    } catch (error: any) {
      toast.error(error.details || error.error || 'Failed to book flight');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Your Booking"
      size="md"
    >
      <div className="space-y-6">
        {/* Flight Summary */}
        <div className="glass-card p-4 bg-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cosmic-gradient">
              <Plane className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-star-white">
                {flight.origin} → {flight.destination}
              </h3>
              <p className="text-sm text-star-white/60">
                Flight #{flight.flight_id}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Departure */}
            <div className="flex items-start gap-3">
              <Calendar className="text-cosmic-purple mt-1" size={20} />
              <div>
                <p className="text-xs text-star-white/60">Departure</p>
                <p className="text-star-white font-medium">
                  {formatDate(flight.departure_time)}
                </p>
              </div>
            </div>

            {/* Arrival */}
            <div className="flex items-start gap-3">
              <Calendar className="text-cosmic-purple mt-1" size={20} />
              <div>
                <p className="text-xs text-star-white/60">Arrival</p>
                <p className="text-star-white font-medium">
                  {formatDate(flight.arrival_time)}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="text-cosmic-purple mt-1" size={20} />
              <div>
                <p className="text-xs text-star-white/60">Duration</p>
                <p className="text-star-white font-medium">
                  {calculateDuration(flight.departure_time, flight.arrival_time)}
                </p>
              </div>
            </div>

            {/* Available Seats */}
            <div className="flex items-start gap-3">
              <Users className="text-cosmic-purple mt-1" size={20} />
              <div>
                <p className="text-xs text-star-white/60">Available Seats</p>
                <p className="text-star-white font-medium">
                  {flight.seats_available} seats
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Details */}
        <div className="glass-card p-4 bg-white/5 space-y-4">
          <h4 className="text-sm font-semibold text-star-white mb-2">
            Passenger Details
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
              max={flight.seats_available}
              value={numAdults}
              onChange={(e) => setNumAdults(parseInt(e.target.value) || 1)}
              className="w-full"
            />
            <p className="text-xs text-star-white/60 mt-1">
              Each adult requires a seat
            </p>
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

        {/* Booking Summary */}
        {user && (
          <div className="glass-card p-4 bg-white/5">
            <h4 className="text-sm font-semibold text-star-white mb-2">
              Booking Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-star-white/60">Booked by:</span>
                <span className="text-star-white">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-white/60">Adults:</span>
                <span className="text-star-white">{numAdults}</span>
              </div>
              {numInfants > 0 && (
                <div className="flex justify-between">
                  <span className="text-star-white/60">Infants:</span>
                  <span className="text-star-white">{numInfants}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-star-white/60">Seats needed:</span>
                <span className="text-star-white">{totalSeatsNeeded}</span>
              </div>
            </div>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between p-4 glass-card bg-cosmic-gradient">
          <div className="flex items-center gap-2">
            <DollarSign className="text-white" size={24} />
            <span className="text-white font-semibold">Total Price</span>
          </div>
          <span className="text-2xl font-bold text-white">
            {formatCurrency(totalPrice)}
          </span>
        </div>

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
            onClick={handleConfirmBooking}
            isLoading={isLoading}
            className="flex-1"
          >
            Confirm Booking
          </Button>
        </div>

        <p className="text-xs text-star-white/60 text-center">
          By confirming, you agree to our terms and conditions
        </p>
      </div>
    </Modal>
  );
};

// Made with Bob
