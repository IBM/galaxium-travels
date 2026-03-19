import { useState } from 'react';
import type { Flight, SeatClass } from '../../types';
import { Modal, Button } from '../common';
import { Plane, Calendar, Clock, DollarSign, Crown, Rocket, Check } from 'lucide-react';
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
  const [selectedClass, setSelectedClass] = useState<SeatClass | null>(null);

  if (!flight) return null;

  const seatClasses = [
    {
      name: 'Economy',
      class: 'economy' as SeatClass,
      price: flight.economy_price,
      seats: flight.economy_seats_available,
      icon: Plane,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      features: ['Standard seating', 'In-flight entertainment', 'Complimentary snacks'],
    },
    {
      name: 'Business',
      class: 'business' as SeatClass,
      price: flight.business_price,
      seats: flight.business_seats_available,
      icon: Crown,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      features: ['Premium seating', 'Priority boarding', 'Gourmet meals', 'Extra legroom'],
    },
    {
      name: 'Galaxium Class',
      class: 'galaxium' as SeatClass,
      price: flight.galaxium_price,
      seats: flight.galaxium_seats_available,
      icon: Rocket,
      color: 'text-alien-green',
      bgColor: 'bg-alien-green/10',
      borderColor: 'border-alien-green/30',
      features: ['Luxury pods', 'VIP lounge access', 'Personal concierge', 'Zero-G experience'],
    },
  ];

  const selectedClassData = selectedClass ? seatClasses.find(sc => sc.class === selectedClass) : null;
  const isSelectedClassSoldOut = selectedClassData ? selectedClassData.seats === 0 : false;

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
        seat_class: selectedClass,
      });

      if (isErrorResponse(result)) {
        toast.error(result.details || result.error);
        return;
      }

      toast.success(`Flight booked successfully in ${selectedClassData?.name}!`);
      onSuccess();
      onClose();
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

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-star-white/60 mb-1">Departure</p>
              <p className="text-star-white font-medium">
                {formatDate(flight.departure_time, 'MMM dd')}
              </p>
            </div>
            <div>
              <p className="text-xs text-star-white/60 mb-1">Arrival</p>
              <p className="text-star-white font-medium">
                {formatDate(flight.arrival_time, 'MMM dd')}
              </p>
            </div>
            <div>
              <p className="text-xs text-star-white/60 mb-1">Duration</p>
              <p className="text-star-white font-medium">
                {calculateDuration(flight.departure_time, flight.arrival_time)}
              </p>
            </div>
          </div>
        </div>

        {/* Seat Class Selection */}
        <div>
          <h4 className="text-sm font-semibold text-star-white mb-3">Select Seat Class</h4>
          <div className="space-y-3">
            {seatClasses.map((seatClass) => {
              const Icon = seatClass.icon;
              const isSelected = selectedClass === seatClass.class;
              const isSoldOut = seatClass.seats === 0;
              
              return (
                <button
                  key={seatClass.class}
                  onClick={() => !isSoldOut && setSelectedClass(seatClass.class)}
                  disabled={isSoldOut}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? `${seatClass.borderColor} ${seatClass.bgColor}`
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  } ${isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={20} className={seatClass.color} />
                      <span className="font-semibold text-star-white">{seatClass.name}</span>
                      {isSelected && <Check size={18} className={seatClass.color} />}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${seatClass.color}`}>
                        {formatCurrency(seatClass.price)}
                      </div>
                      <div className="text-xs text-star-white/60">
                        {isSoldOut ? 'Sold Out' : `${seatClass.seats} left`}
                      </div>
                    </div>
                  </div>
                  <ul className="text-left text-xs text-star-white/70 space-y-1">
                    {seatClass.features.map((feature, idx) => (
                      <li key={idx}>• {feature}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
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
            {formatCurrency(selectedClassData?.price || flight.economy_price)}
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
            disabled={!selectedClass || isSelectedClassSoldOut}
            className="flex-1"
          >
            {!selectedClass ? 'Select a Seat Class' : isSelectedClassSoldOut ? 'Class Sold Out' : 'Confirm Booking'}
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
