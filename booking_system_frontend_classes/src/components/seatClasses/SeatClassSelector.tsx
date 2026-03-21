import { SeatClassCard } from './SeatClassCard';
import type { Flight, SeatClassName } from '../../types';

interface SeatClassSelectorProps {
  flight: Flight;
  selectedClass: SeatClassName | null;
  onSelectClass: (className: SeatClassName) => void;
}

const SEAT_CLASS_INFO = {
  economy: {
    displayName: 'Economy Class',
    description: 'Standard seating for space travel',
    features: [
      'Standard seat',
      'In-flight meal',
      'Entertainment system',
      '20kg luggage allowance'
    ]
  },
  business: {
    displayName: 'Business Class',
    description: 'Enhanced comfort and amenities',
    features: [
      'Spacious seat with extra legroom',
      'Premium meals and beverages',
      'Priority boarding',
      'Extra luggage (40kg)',
      'Access to business lounge'
    ]
  },
  galaxium: {
    displayName: 'Galaxium Class',
    description: 'Premium luxury experience',
    features: [
      'Luxury pod with full recline',
      'Gourmet dining experience',
      'VIP lounge access',
      'Personal concierge service',
      'Unlimited luggage',
      'Exclusive amenities kit'
    ]
  }
};

export const SeatClassSelector = ({
  flight,
  selectedClass,
  onSelectClass
}: SeatClassSelectorProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-star-white mb-6">
        Select Your Seat Class
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(SEAT_CLASS_INFO) as SeatClassName[]).map((className) => {
          const info = SEAT_CLASS_INFO[className];
          const availability = flight.seat_classes[className];
          
          return (
            <SeatClassCard
              key={className}
              className={className}
              displayName={info.displayName}
              description={info.description}
              features={info.features}
              availability={availability}
              isSelected={selectedClass === className}
              onSelect={() => onSelectClass(className)}
            />
          );
        })}
      </div>
    </div>
  );
};

// Made with Bob
