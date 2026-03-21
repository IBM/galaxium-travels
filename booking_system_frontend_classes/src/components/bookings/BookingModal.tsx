import { useState } from 'react';
import type { Flight, SeatClassName } from '../../types';
import { Modal, Button } from '../common';
import { Plane, Calendar, Clock, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate, calculateDuration } from '../../utils/formatters';
import { bookFlight, isErrorResponse } from '../../services/api';
import { useUser } from '../../hooks/useUser';
import { SeatClassSelector } from '../seatClasses/SeatClassSelector';
import { SeatClassBadge } from '../seatClasses/SeatClassBadge';
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
  const [selectedSeatClass, setSelectedSeatClass] = useState<SeatClassName>('economy');
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  if (!flight) return null;

  const selectedClassPrice = flight.seat_classes[selectedSeatClass].price;
  const selectedClassAvailable = flight.seat_classes[selectedSeatClass].seats_available;

  const handleContinue = () => {
    if (selectedClassAvailable === 0) {
      toast.error('Selected seat class is sold out');
      return;
    }
    setStep('confirm');
  };

  const handleBack = () => {
    setStep('select');
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error('Please sign in to book a flight');
      return;
    }

    setIsLoading(true);

    try {
      const result = await bookFlight({
        user_id: user.user_id,
        name: user.name,
        flight_id: flight.flight_id,
        seat_class: selectedSeatClass,
      });

      if (isErrorResponse(result)) {
        toast.error(result.details || result.error);
        return;
      }

      toast.success('Flight booked successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.details || error.error || 'Failed to book flight');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedSeatClass('economy');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'select' ? 'Select Seat Class' : 'Confirm Your Booking'}
      size="lg"
    >
      {step === 'select' ? (
        <div className="space-y-6">
          {/* Flight Info Header */}
          <div className="glass-card p-4 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cosmic-gradient">
                <Plane className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-star-white">
                  {flight.origin} → {flight.destination}
                </h3>
                <p className="text-sm text-star-white/60">
                  {formatDate(flight.departure_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Seat Class Selector */}
          <SeatClassSelector
            flight={flight}
            selectedClass={selectedSeatClass}
            onSelectClass={setSelectedSeatClass}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={selectedClassAvailable === 0}
              className="flex-1"
            >
              Continue to Booking
            </Button>
          </div>
        </div>
      ) : (
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
            </div>
          </div>

          {/* Seat Class Selection */}
          <div className="glass-card p-4 bg-white/5">
            <h4 className="text-sm font-semibold text-star-white mb-2">
              Selected Seat Class
            </h4>
            <div className="flex items-center justify-between">
              <SeatClassBadge className={selectedSeatClass} size="lg" />
              <button
                onClick={handleBack}
                className="text-sm text-cosmic-purple hover:text-cosmic-purple/80 transition-colors"
              >
                Change
              </button>
            </div>
          </div>

          {/* Passenger Info */}
          {user && (
            <div className="glass-card p-4 bg-white/5">
              <h4 className="text-sm font-semibold text-star-white mb-2">
                Passenger Information
              </h4>
              <p className="text-star-white">{user.name}</p>
              <p className="text-star-white/60 text-sm">{user.email}</p>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center justify-between p-4 glass-card bg-cosmic-gradient">
            <div className="flex items-center gap-2">
              <DollarSign className="text-white" size={24} />
              <span className="text-white font-semibold">Total Price</span>
            </div>
            <span className="text-2xl font-bold text-white">
              {formatCurrency(selectedClassPrice)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={isLoading}
              className="flex-1"
            >
              Back
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
      )}
    </Modal>
  );
};

// Made with Bob
