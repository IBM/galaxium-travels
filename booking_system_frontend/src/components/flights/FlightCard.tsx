import type { Flight } from '../../types';
import { Card, Button } from '../common';
import { Plane, Clock } from 'lucide-react';
import { formatCurrency, formatDate, formatTime, calculateDuration } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface FlightCardProps {
  flight: Flight;
  onBook: (flight: Flight) => void;
}

const seatClasses = [
  { key: 'economy_seats' as const,  label: 'Economy',  multiplier: 1, color: 'text-star-white' },
  { key: 'business_seats' as const, label: 'Business', multiplier: 2, color: 'text-cosmic-purple' },
  { key: 'galaxium_seats' as const, label: 'Galaxium', multiplier: 4, color: 'text-solar-orange' },
] as const;

export const FlightCard = ({ flight, onBook }: FlightCardProps) => {
  const isFullySoldOut =
    flight.economy_seats === 0 &&
    flight.business_seats === 0 &&
    flight.galaxium_seats === 0;

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

          {/* Seat-class summary */}
          <div className="rounded-lg bg-white/5 border border-white/10 divide-y divide-white/10">
            {seatClasses.map(({ key, label, multiplier, color }) => {
              const seats = flight[key];
              const soldOut = seats === 0;
              return (
                <div key={key} className="flex items-center justify-between px-3 py-2">
                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-star-white">
                      {formatCurrency(flight.price * multiplier)}
                    </span>
                    <span className={`text-xs ${soldOut ? 'text-solar-orange font-semibold' : 'text-star-white/60'}`}>
                      {soldOut ? 'Sold out' : `${seats} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Book Button */}
        <Button
          onClick={() => onBook(flight)}
          disabled={isFullySoldOut}
          className="w-full"
        >
          {isFullySoldOut ? 'Sold Out' : 'Book Now'}
        </Button>
      </Card>
    </motion.div>
  );
};

// Made with Bob
