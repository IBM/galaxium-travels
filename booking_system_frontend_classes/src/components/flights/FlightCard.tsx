import type { Flight } from '../../types';
import { Card, Button } from '../common';
import { Plane, Clock, DollarSign, Users } from 'lucide-react';
import { formatCurrency, formatDate, formatTime, calculateDuration } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface FlightCardProps {
  flight: Flight;
  onBook: (flight: Flight) => void;
}

export const FlightCard = ({ flight, onBook }: FlightCardProps) => {
  const totalSeatsAvailable = flight.total_seats_available;
  const isSoldOut = totalSeatsAvailable === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col">
        {/* Route Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
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
        </div>

        {/* Flight Details */}
        <div className="space-y-3 mb-6 flex-1">
          {/* Departure & Arrival */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-star-white/60 mb-1">Departure</p>
              <p className="text-sm font-medium text-star-white">
                {formatDate(flight.departure_time, 'MMM dd, yyyy')}
              </p>
              <p className="text-lg font-bold text-cosmic-purple">
                {formatTime(flight.departure_time)}
              </p>
            </div>
            <div>
              <p className="text-xs text-star-white/60 mb-1">Arrival</p>
              <p className="text-sm font-medium text-star-white">
                {formatDate(flight.arrival_time, 'MMM dd, yyyy')}
              </p>
              <p className="text-lg font-bold text-cosmic-purple">
                {formatTime(flight.arrival_time)}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-star-white/70">
            <Clock size={16} />
            <span className="text-sm">
              Duration: {calculateDuration(flight.departure_time, flight.arrival_time)}
            </span>
          </div>

          {/* Seat Classes Availability */}
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-semibold text-star-white/80">Available Classes:</h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Economy */}
              <div className="text-center p-2 glass-card bg-blue-500/10 rounded border border-blue-500/30">
                <div className="text-xs text-blue-400 mb-1 font-semibold">Economy</div>
                <div className="text-sm font-bold text-star-white">
                  {formatCurrency(flight.seat_classes.economy.price)}
                </div>
                <div className={`text-xs mt-1 ${
                  flight.seat_classes.economy.seats_available === 0 
                    ? 'text-red-400' 
                    : flight.seat_classes.economy.seats_available <= 2 
                    ? 'text-solar-orange' 
                    : 'text-star-white/60'
                }`}>
                  {flight.seat_classes.economy.seats_available === 0 
                    ? 'Sold Out' 
                    : `${flight.seat_classes.economy.seats_available} seats`
                  }
                </div>
              </div>

              {/* Business */}
              <div className="text-center p-2 glass-card bg-purple-500/10 rounded border border-purple-500/30">
                <div className="text-xs text-purple-400 mb-1 font-semibold">Business</div>
                <div className="text-sm font-bold text-star-white">
                  {formatCurrency(flight.seat_classes.business.price)}
                </div>
                <div className={`text-xs mt-1 ${
                  flight.seat_classes.business.seats_available === 0 
                    ? 'text-red-400' 
                    : flight.seat_classes.business.seats_available <= 2 
                    ? 'text-solar-orange' 
                    : 'text-star-white/60'
                }`}>
                  {flight.seat_classes.business.seats_available === 0 
                    ? 'Sold Out' 
                    : `${flight.seat_classes.business.seats_available} seats`
                  }
                </div>
              </div>

              {/* Galaxium */}
              <div className="text-center p-2 glass-card bg-yellow-500/10 rounded border border-yellow-500/30">
                <div className="text-xs text-yellow-400 mb-1 font-semibold">Galaxium</div>
                <div className="text-sm font-bold text-star-white">
                  {formatCurrency(flight.seat_classes.galaxium.price)}
                </div>
                <div className={`text-xs mt-1 ${
                  flight.seat_classes.galaxium.seats_available === 0 
                    ? 'text-red-400' 
                    : flight.seat_classes.galaxium.seats_available <= 2 
                    ? 'text-solar-orange' 
                    : 'text-star-white/60'
                }`}>
                  {flight.seat_classes.galaxium.seats_available === 0 
                    ? 'Sold Out' 
                    : `${flight.seat_classes.galaxium.seats_available} seats`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Total Seats Available */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <Users size={16} className={totalSeatsAvailable <= 5 ? 'text-solar-orange' : 'text-star-white/70'} />
            <span className={`text-sm ${totalSeatsAvailable <= 5 ? 'text-solar-orange font-semibold' : 'text-star-white/70'}`}>
              {isSoldOut ? 'All Classes Sold Out' : `${totalSeatsAvailable} total seats available`}
            </span>
          </div>
        </div>

        {/* Book Button */}
        <Button
          onClick={() => onBook(flight)}
          disabled={isSoldOut}
          className="w-full"
        >
          {isSoldOut ? 'Sold Out' : 'Book Now'}
        </Button>
      </Card>
    </motion.div>
  );
};

// Made with Bob
