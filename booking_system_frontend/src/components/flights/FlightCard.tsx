import type { Flight, SeatClass } from '../../types';
import { Card, Button } from '../common';
import { Plane, Time, User, Trophy, Rocket } from '@carbon/icons-react';
import { formatCurrency, formatDate, formatTime, calculateDuration } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface FlightCardProps {
  flight: Flight;
  onBook: (flight: Flight) => void;
}

export const FlightCard = ({ flight, onBook }: FlightCardProps) => {
  const totalSeats = flight.economy_seats_available + flight.business_seats_available + flight.galaxium_seats_available;
  const isSoldOut = totalSeats === 0;

  const seatClasses = [
    {
      name: 'Economy',
      class: 'economy' as SeatClass,
      price: flight.economy_price,
      seats: flight.economy_seats_available,
      icon: Plane,
      color: 'text-support-04',
      bgColor: 'bg-support-04/10',
      borderColor: 'border-support-04/30',
    },
    {
      name: 'Business',
      class: 'business' as SeatClass,
      price: flight.business_price,
      seats: flight.business_seats_available,
      icon: Trophy,
      color: 'text-interactive-01',
      bgColor: 'bg-interactive-01/10',
      borderColor: 'border-interactive-01/30',
    },
    {
      name: 'Galaxium Class',
      class: 'galaxium' as SeatClass,
      price: flight.galaxium_price,
      seats: flight.galaxium_seats_available,
      icon: Rocket,
      color: 'text-support-02',
      bgColor: 'bg-support-02/10',
      borderColor: 'border-support-02/30',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col">
        {/* Route Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-ui-03">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-interactive-01">
              <Plane className="text-text-04" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-01">
                {flight.origin} → {flight.destination}
              </h3>
              <p className="text-sm text-text-03">
                Flight #{flight.flight_id}
              </p>
            </div>
          </div>
        </div>

        {/* Flight Details */}
        <div className="space-y-4 mb-6 flex-1">
          {/* Departure & Arrival */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-03 mb-1">Departure</p>
              <p className="text-sm font-medium text-text-01">
                {formatDate(flight.departure_time, 'MMM dd, yyyy')}
              </p>
              <p className="text-lg font-bold text-interactive-01">
                {formatTime(flight.departure_time)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-03 mb-1">Arrival</p>
              <p className="text-sm font-medium text-text-01">
                {formatDate(flight.arrival_time, 'MMM dd, yyyy')}
              </p>
              <p className="text-lg font-bold text-interactive-01">
                {formatTime(flight.arrival_time)}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-text-02">
            <Time size={16} />
            <span className="text-sm">
              Duration: {calculateDuration(flight.departure_time, flight.arrival_time)}
            </span>
          </div>

          {/* Seat Classes */}
          <div className="space-y-2">
            <p className="text-xs text-text-03 mb-2">Available Seat Classes</p>
            {seatClasses.map((seatClass) => {
              const Icon = seatClass.icon;
              const isClassSoldOut = seatClass.seats === 0;
              const isLowSeats = seatClass.seats <= 2 && seatClass.seats > 0;
              
              return (
                <div
                  key={seatClass.class}
                  className={`p-3 rounded border ${seatClass.borderColor} ${seatClass.bgColor} ${
                    isClassSoldOut ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={seatClass.color} />
                      <span className="font-medium text-text-01">{seatClass.name}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${seatClass.color}`}>
                        {formatCurrency(seatClass.price)}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <User size={12} className={isLowSeats ? 'text-support-03' : 'text-text-03'} />
                        <span className={isLowSeats ? 'text-support-03 font-semibold' : 'text-text-03'}>
                          {isClassSoldOut ? 'Sold Out' : `${seatClass.seats} left`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Book Button */}
        <Button
          onClick={() => onBook(flight)}
          disabled={isSoldOut}
          className="w-full"
        >
          {isSoldOut ? 'All Classes Sold Out' : 'Select Seat Class'}
        </Button>
      </Card>
    </motion.div>
  );
};

// Made with Bob
