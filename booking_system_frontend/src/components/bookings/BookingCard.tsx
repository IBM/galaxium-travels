import type { Booking, Flight } from '../../types';
import { Card, Button } from '../common';
import { Plane, Calendar, CheckCircle, XCircle, Clock, Crown, Rocket } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface BookingCardProps {
  booking: Booking;
  flight?: Flight;
  onCancel: (bookingId: number) => void;
  isCancelling?: boolean;
}

export const BookingCard = ({ booking, flight, onCancel, isCancelling }: BookingCardProps) => {
  const getSeatClassIcon = () => {
    switch (booking.seat_class) {
      case 'business':
        return <Crown className="text-purple-400" size={16} />;
      case 'galaxium':
        return <Rocket className="text-alien-green" size={16} />;
      default:
        return <Plane className="text-blue-400" size={16} />;
    }
  };

  const getSeatClassName = () => {
    switch (booking.seat_class) {
      case 'business':
        return 'Business';
      case 'galaxium':
        return 'Galaxium Class';
      default:
        return 'Economy';
    }
  };

  const getSeatClassColor = () => {
    switch (booking.seat_class) {
      case 'business':
        return 'text-purple-400';
      case 'galaxium':
        return 'text-alien-green';
      default:
        return 'text-blue-400';
    }
  };
  const getStatusIcon = () => {
    switch (booking.status) {
      case 'booked':
        return <CheckCircle className="text-alien-green" size={20} />;
      case 'cancelled':
        return <XCircle className="text-red-500" size={20} />;
      case 'completed':
        return <CheckCircle className="text-blue-500" size={20} />;
      default:
        return <Clock className="text-star-white/50" size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (booking.status) {
      case 'booked':
        return 'text-alien-green';
      case 'cancelled':
        return 'text-red-500';
      case 'completed':
        return 'text-blue-500';
      default:
        return 'text-star-white/50';
    }
  };

  const canCancel = booking.status === 'booked';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cosmic-gradient">
              <Plane className="text-white" size={20} />
            </div>
            <div>
              <p className="text-sm text-star-white/60">Booking #{booking.booking_id}</p>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon()}
                <span className={`text-sm font-semibold capitalize ${getStatusColor()}`}>
                  {booking.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Flight Details */}
        {flight ? (
          <div className="space-y-3 mb-4">
            <div>
              <h3 className="text-xl font-bold text-star-white mb-1">
                {flight.origin} → {flight.destination}
              </h3>
              <p className="text-sm text-star-white/60">Flight #{flight.flight_id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-star-white/60 mb-1">Departure</p>
                <p className="text-sm text-star-white font-medium">
                  {formatDate(flight.departure_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-star-white/60 mb-1">Arrival</p>
                <p className="text-sm text-star-white font-medium">
                  {formatDate(flight.arrival_time)}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-star-white/60">Seat Class</span>
                <div className="flex items-center gap-2">
                  {getSeatClassIcon()}
                  <span className={`text-sm font-semibold ${getSeatClassColor()}`}>
                    {getSeatClassName()}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-star-white/60">Price Paid</span>
                <span className="text-lg font-bold text-star-white">
                  {formatCurrency(booking.price_paid)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-star-white/60">Flight ID: {booking.flight_id}</p>
          </div>
        )}

        {/* Booking Time */}
        <div className="flex items-center gap-2 text-sm text-star-white/60 mb-4">
          <Calendar size={16} />
          <span>Booked on {formatDate(booking.booking_time)}</span>
        </div>

        {/* Cancel Button */}
        {canCancel && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onCancel(booking.booking_id)}
            isLoading={isCancelling}
            className="w-full"
          >
            Cancel Booking
          </Button>
        )}
      </Card>
    </motion.div>
  );
};

// Made with Bob
