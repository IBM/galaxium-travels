import type { Flight, SeatClass } from '../../types';
import { Card, Button } from '../common';
import { Plane, Clock, Users } from 'lucide-react';
import { formatCurrency, formatDate, formatTime, calculateDuration } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface FlightCardProps {
  flight: Flight;
  onBook: (flight: Flight, seatClass: SeatClass) => void;
}

const CLASSES: { key: SeatClass; label: string }[] = [
  { key: 'economy',  label: 'Economy'  },
  { key: 'business', label: 'Business' },
  { key: 'galaxium', label: 'Galaxium' },
];

export const FlightCard = ({ flight, onBook }: FlightCardProps) => {
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

          {/* Seat Class Selector */}
          <div className="space-y-2 pt-1">
            {CLASSES.map(({ key, label }) => {
              const price = flight[`${key}_price` as keyof Flight] as number;
              const seats = flight[`${key}_seats` as keyof Flight] as number;
              const isSoldOut = seats === 0;
              const isLow = seats > 0 && seats <= 5;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
                >
                  {/* Class info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-star-white capitalize">{label}</p>
                    <p className="text-base font-bold text-star-white">
                      {formatCurrency(price)}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users
                        size={12}
                        className={isLow ? 'text-solar-orange' : 'text-star-white/50'}
                      />
                      <span
                        className={`text-xs ${
                          isSoldOut
                            ? 'text-red-400'
                            : isLow
                            ? 'text-solar-orange font-semibold'
                            : 'text-star-white/50'
                        }`}
                      >
                        {isSoldOut ? 'Sold Out' : `${seats} seats`}
                      </span>
                    </div>
                  </div>

                  {/* Book button for this class */}
                  <Button
                    onClick={() => onBook(flight, key)}
                    disabled={isSoldOut}
                    size="sm"
                  >
                    {isSoldOut ? 'Sold Out' : 'Book'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Made with Bob
