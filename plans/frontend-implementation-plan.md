# Frontend Implementation Plan for Seat Classes

## Project Structure

### New Frontend: booking_system_frontend_classes

```
booking_system_frontend_classes/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── bookings/
│   │   │   ├── BookingCard.tsx (updated)
│   │   │   └── BookingModal.tsx (updated with seat class selection)
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Starfield.tsx
│   │   │   └── index.ts
│   │   ├── flights/
│   │   │   ├── FlightCard.tsx (updated with seat classes)
│   │   │   └── SeatClassSelector.tsx (NEW)
│   │   ├── layout/
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   ├── seatClasses/
│   │   │   ├── SeatClassCard.tsx (NEW)
│   │   │   ├── SeatClassBadge.tsx (NEW)
│   │   │   └── SeatClassComparison.tsx (NEW)
│   │   └── user/
│   │       └── UserIdentification.tsx
│   ├── hooks/
│   │   ├── useUser.tsx
│   │   └── useSeatClasses.tsx (NEW)
│   ├── pages/
│   │   ├── Flights.tsx (updated)
│   │   ├── Home.tsx
│   │   └── MyBookings.tsx (updated)
│   ├── services/
│   │   └── api.ts (updated with seat class endpoints)
│   ├── types/
│   │   └── index.ts (updated with seat class types)
│   ├── utils/
│   │   └── formatters.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts (updated for port 5174)
└── README.md
```

## New TypeScript Types

### types/index.ts Updates

```typescript
// Seat class types
export type SeatClassName = 'economy' | 'business' | 'galaxium';

export interface SeatClassAvailability {
  price: number;
  seats_available: number;
  multiplier: number;
}

export interface SeatClassInfo {
  class_name: SeatClassName;
  display_name: string;
  price_multiplier: number;
  description: string;
  features: string[];
}

// Updated Flight interface
export interface Flight {
  flight_id: number;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  seat_classes: {
    economy: SeatClassAvailability;
    business: SeatClassAvailability;
    galaxium: SeatClassAvailability;
  };
  total_seats_available: number;
  // Deprecated fields (for backward compatibility)
  price: number;
  seats_available: number;
}

// Updated Booking interface
export interface Booking {
  booking_id: number;
  user_id: number;
  flight_id: number;
  seat_class: SeatClassName;
  price_paid: number;
  status: 'booked' | 'cancelled' | 'completed';
  booking_time: string;
}

// Updated BookingRequest
export interface BookingRequest {
  user_id: number;
  name: string;
  flight_id: number;
  seat_class: SeatClassName;
}

// UI State types
export interface SelectedSeatClass {
  className: SeatClassName;
  price: number;
  seatsAvailable: number;
}
```

## New Components

### 1. SeatClassCard.tsx
**Purpose:** Display individual seat class option with pricing and features

```typescript
import { Card } from '../common';
import { Check, Star, Sparkles } from 'lucide-react';
import { SeatClassName, SeatClassAvailability } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SeatClassCardProps {
  className: SeatClassName;
  displayName: string;
  description: string;
  features: string[];
  availability: SeatClassAvailability;
  isSelected: boolean;
  onSelect: () => void;
  isDisabled?: boolean;
}

export const SeatClassCard = ({
  className,
  displayName,
  description,
  features,
  availability,
  isSelected,
  onSelect,
  isDisabled = false
}: SeatClassCardProps) => {
  const isSoldOut = availability.seats_available === 0;
  const isLowSeats = availability.seats_available <= 2 && availability.seats_available > 0;
  
  // Icon based on class
  const ClassIcon = className === 'galaxium' ? Sparkles : 
                    className === 'business' ? Star : null;
  
  // Color scheme based on class
  const colorScheme = {
    economy: 'border-blue-500/50 hover:border-blue-500',
    business: 'border-purple-500/50 hover:border-purple-500',
    galaxium: 'border-yellow-500/50 hover:border-yellow-500'
  };
  
  const selectedStyle = isSelected ? 'ring-2 ring-offset-2 ring-offset-space-black' : '';
  const disabledStyle = (isSoldOut || isDisabled) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  return (
    <Card 
      className={`
        relative transition-all duration-300
        ${colorScheme[className]}
        ${selectedStyle}
        ${disabledStyle}
      `}
      onClick={() => !isSoldOut && !isDisabled && onSelect()}
    >
      {/* Premium badge for Galaxium */}
      {className === 'galaxium' && (
        <div className="absolute -top-3 -right-3 bg-cosmic-gradient px-3 py-1 rounded-full">
          <span className="text-xs font-bold text-white">PREMIUM</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {ClassIcon && <ClassIcon className="text-cosmic-purple" size={24} />}
          <h3 className="text-xl font-bold text-star-white">{displayName}</h3>
        </div>
        {isSelected && <Check className="text-alien-green" size={24} />}
      </div>
      
      {/* Description */}
      <p className="text-sm text-star-white/70 mb-4">{description}</p>
      
      {/* Price */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-star-white">
          {formatCurrency(availability.price)}
        </div>
        <div className="text-xs text-star-white/60">
          {availability.multiplier}x base price
        </div>
      </div>
      
      {/* Features */}
      <div className="space-y-2 mb-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <Check className="text-alien-green mt-0.5 flex-shrink-0" size={16} />
            <span className="text-sm text-star-white/80">{feature}</span>
          </div>
        ))}
      </div>
      
      {/* Availability */}
      <div className="mt-auto pt-4 border-t border-white/10">
        {isSoldOut ? (
          <span className="text-sm text-solar-orange font-semibold">Sold Out</span>
        ) : isLowSeats ? (
          <span className="text-sm text-solar-orange font-semibold">
            Only {availability.seats_available} seats left!
          </span>
        ) : (
          <span className="text-sm text-star-white/70">
            {availability.seats_available} seats available
          </span>
        )}
      </div>
    </Card>
  );
};
```

### 2. SeatClassSelector.tsx
**Purpose:** Container for seat class selection during booking

```typescript
import { useState } from 'react';
import { SeatClassCard } from './SeatClassCard';
import { Flight, SeatClassName } from '../../types';

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
```

### 3. SeatClassBadge.tsx
**Purpose:** Small badge to display seat class in booking cards

```typescript
import { Star, Sparkles } from 'lucide-react';
import { SeatClassName } from '../../types';

interface SeatClassBadgeProps {
  className: SeatClassName;
  size?: 'sm' | 'md' | 'lg';
}

export const SeatClassBadge = ({ className, size = 'md' }: SeatClassBadgeProps) => {
  const config = {
    economy: {
      label: 'Economy',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/50',
      icon: null
    },
    business: {
      label: 'Business',
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/50',
      icon: Star
    },
    galaxium: {
      label: 'Galaxium',
      bgColor: 'bg-yellow-500/20',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/50',
      icon: Sparkles
    }
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };
  
  const classConfig = config[className];
  const Icon = classConfig.icon;
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full border
      ${classConfig.bgColor}
      ${classConfig.textColor}
      ${classConfig.borderColor}
      ${sizeClasses[size]}
      font-semibold
    `}>
      {Icon && <Icon size={iconSizes[size]} />}
      {classConfig.label}
    </span>
  );
};
```

## Updated Components

### Updated FlightCard.tsx
**Changes:** Display seat class availability and pricing

```typescript
// Add seat class display section
<div className="space-y-2 mb-4">
  <h4 className="text-sm font-semibold text-star-white/80">Available Classes:</h4>
  <div className="grid grid-cols-3 gap-2">
    {Object.entries(flight.seat_classes).map(([className, availability]) => (
      <div key={className} className="text-center p-2 glass-card bg-white/5 rounded">
        <div className="text-xs text-star-white/60 mb-1 capitalize">{className}</div>
        <div className="text-sm font-bold text-star-white">
          {formatCurrency(availability.price)}
        </div>
        <div className="text-xs text-star-white/60">
          {availability.seats_available} seats
        </div>
      </div>
    ))}
  </div>
</div>
```

### Updated BookingModal.tsx
**Changes:** Add seat class selector before confirmation

```typescript
const [selectedSeatClass, setSelectedSeatClass] = useState<SeatClassName>('economy');

// Add SeatClassSelector component
<SeatClassSelector
  flight={flight}
  selectedClass={selectedSeatClass}
  onSelectClass={setSelectedSeatClass}
/>

// Update booking request to include seat class
const result = await bookFlight({
  user_id: user.user_id,
  name: user.name,
  flight_id: flight.flight_id,
  seat_class: selectedSeatClass
});
```

### Updated BookingCard.tsx
**Changes:** Display seat class badge and price paid

```typescript
// Add seat class badge
<SeatClassBadge className={booking.seat_class} size="sm" />

// Display price paid instead of flight price
<div className="flex items-center gap-2">
  <DollarSign size={16} className="text-alien-green" />
  <span className="text-lg font-bold text-star-white">
    {formatCurrency(booking.price_paid)}
  </span>
</div>
```

## API Service Updates

### services/api.ts

```typescript
// Update API base URL if needed
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Updated types
export interface FlightWithClasses {
  flight_id: number;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  seat_classes: {
    economy: SeatClassAvailability;
    business: SeatClassAvailability;
    galaxium: SeatClassAvailability;
  };
  total_seats_available: number;
}

export interface BookingRequestWithClass {
  user_id: number;
  name: string;
  flight_id: number;
  seat_class: SeatClassName;
}

// New endpoint: Get seat class information
export const getSeatClasses = async (): Promise<SeatClassInfo[]> => {
  const response = await fetch(`${API_BASE_URL}/seat-classes`);
  if (!response.ok) throw new Error('Failed to fetch seat classes');
  return response.json();
};

// Updated bookFlight function
export const bookFlight = async (
  booking: BookingRequestWithClass
): Promise<BookingWithClass | ErrorResponse> => {
  const response = await fetch(`${API_BASE_URL}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  return response.json();
};
```

## Configuration Changes

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,  // Changed from 5173
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

### package.json
```json
{
  "name": "booking-system-frontend-classes",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "tsc && vite build",
    "preview": "vite preview --port 5174"
  }
}
```

## UI/UX Design Guidelines

### Color Scheme by Class
- **Economy**: Blue tones (#3B82F6)
- **Business**: Purple tones (#A855F7)
- **Galaxium**: Gold/Yellow tones (#EAB308)

### Visual Hierarchy
1. Galaxium class should have premium visual treatment (gradients, animations)
2. Business class should have elegant styling
3. Economy class should be clean and straightforward

### Responsive Design
- Mobile: Stack seat class cards vertically
- Tablet: 2-column grid for seat classes
- Desktop: 3-column grid for seat classes

### Animations
- Smooth transitions when selecting seat class
- Hover effects on seat class cards
- Loading states during booking
- Success animations on booking confirmation

## Testing Requirements

### Component Tests
- [ ] SeatClassCard renders correctly for each class
- [ ] SeatClassSelector handles selection properly
- [ ] SeatClassBadge displays correct styling
- [ ] FlightCard shows all seat classes
- [ ] BookingModal includes seat class selection
- [ ] BookingCard displays seat class information

### Integration Tests
- [ ] Complete booking flow with seat class selection
- [ ] Seat availability updates after booking
- [ ] Price calculation matches selected class
- [ ] Error handling for sold-out classes
- [ ] Booking history shows correct seat class

### E2E Tests
- [ ] User can view flights with seat classes
- [ ] User can select different seat classes
- [ ] User can complete booking with selected class
- [ ] User can view bookings with seat class info
- [ ] Both frontends work simultaneously

## Accessibility Considerations

- Keyboard navigation for seat class selection
- Screen reader support for seat class information
- Color contrast ratios meet WCAG standards
- Focus indicators on interactive elements
- ARIA labels for seat class cards

## Performance Optimization

- Lazy load seat class images/icons
- Memoize seat class calculations
- Optimize re-renders with React.memo
- Use virtual scrolling for large flight lists
- Cache seat class configuration

## Next Steps

1. Clone existing frontend to booking_system_frontend_classes
2. Update configuration for port 5174
3. Implement new TypeScript types
4. Create new seat class components
5. Update existing components
6. Update API service layer
7. Test all components
8. Update documentation