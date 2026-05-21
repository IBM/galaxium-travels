import { useState } from 'react';
import type { Booking, Flight } from '../../types';
import { Card, Button } from '../common';
import { Plane, Calendar, CheckCircle, XCircle, Clock, Users, Baby, Edit } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface BookingCardProps {
  booking: Booking;
  flight?: Flight;
  onCancel: (bookingId: number) => void;
  onEdit?: (booking: Booking) => void;
  isCancelling?: boolean;
}

export const BookingCard = ({ booking, flight, onCancel, onEdit, isCancelling }: BookingCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

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
  const canEdit = booking.status === 'booked';

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

            {/* Passenger Information */}
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-star-white/60">Passengers</span>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-cosmic-purple hover:text-nebula-pink transition-colors"
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-cosmic-purple" />
                  <span className="text-star-white">{booking.num_adults} Adult{booking.num_adults !== 1 ? 's' : ''}</span>
                </div>
                {booking.num_infants > 0 && (
                  <div className="flex items-center gap-2">
                    <Baby size={16} className="text-nebula-pink" />
                    <span className="text-star-white">{booking.num_infants} Infant{booking.num_infants !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {showDetails && booking.passenger_names && (
                <div className="mt-2 p-2 rounded bg-white/5">
                  <p className="text-xs text-star-white/60 mb-1">Passenger Names:</p>
                  <p className="text-sm text-star-white">{booking.passenger_names}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-sm text-star-white/60">Total Price</span>
              <span className="text-lg font-bold text-star-white">
                {formatCurrency(flight.price * booking.num_adults)}
              </span>
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canEdit && onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(booking)}
              className="flex-1"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
          )}
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onCancel(booking.booking_id)}
              isLoading={isCancelling}
              className="flex-1"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// Made with Bob
