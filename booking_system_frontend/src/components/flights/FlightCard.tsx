import type { Flight, SeatClass } from '../../types';
import { Card, Button, TrajectoryMap } from '../common';
import { Plane, Clock, Users, Crown, Rocket } from 'lucide-react';
import { formatCurrency, formatDate, formatTime, calculateDuration } from '../../utils/formatters';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getDestinationByName } from '../../data/destinations';

interface FlightCardProps {
  flight: Flight;
  onBook: (flight: Flight) => void;
}

export const FlightCard = ({ flight, onBook }: FlightCardProps) => {
  const totalSeats = flight.economy_seats_available + flight.business_seats_available + flight.galaxium_seats_available;
  const isSoldOut = totalSeats === 0;
  const destData = getDestinationByName(flight.destination);
  const destLabel = destData ? (
    <Link
      to={`/destinations/${destData.slug}`}
      className="hover:text-cosmic-purple underline-offset-2 hover:underline transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      {flight.destination}
    </Link>
  ) : (
    <span>{flight.destination}</span>
  );

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
        {/* Route Header — title left, trajectory map right */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
          <div className="p-2 rounded-lg bg-cosmic-gradient flex-shrink-0">
            <Plane className="text-white" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-star-white truncate">
              {flight.origin} → {destLabel}
            </h3>
            <p className="text-sm text-star-white/60">
              Flight #{flight.flight_id}
            </p>
          </div>
          <div className="flex-shrink-0">
            <TrajectoryMap
              origin={flight.origin}
              destination={flight.destination}
              size={90}
              className="opacity-90 rounded-lg overflow-hidden"
            />
          </div>
        </div>

        {/* Flight Details */}
        <div className="space-y-4 mb-6 flex-1">
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

          {/* Seat Classes */}
          <div className="space-y-2">
            <p className="text-xs text-star-white/60 mb-2">Available Seat Classes</p>
            {seatClasses.map((seatClass) => {
              const Icon = seatClass.icon;
              const isClassSoldOut = seatClass.seats === 0;
              const isLowSeats = seatClass.seats <= 2 && seatClass.seats > 0;
              
              return (
                <div
                  key={seatClass.class}
                  className={`p-3 rounded-lg border ${seatClass.borderColor} ${seatClass.bgColor} ${
                    isClassSoldOut ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={seatClass.color} />
                      <span className="font-medium text-star-white">{seatClass.name}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${seatClass.color}`}>
                        {formatCurrency(seatClass.price)}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Users size={12} className={isLowSeats ? 'text-solar-orange' : 'text-star-white/60'} />
                        <span className={isLowSeats ? 'text-solar-orange font-semibold' : 'text-star-white/60'}>
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
