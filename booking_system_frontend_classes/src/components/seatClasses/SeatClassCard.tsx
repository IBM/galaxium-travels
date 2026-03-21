import { Check, Star, Sparkles, Plane } from 'lucide-react';
import { Card } from '../common';
import type { SeatClassName, SeatClassAvailability } from '../../types';

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
                    className === 'business' ? Star : Plane;
  
  // Color scheme based on class
  const colorScheme = {
    economy: 'border-blue-500/50 hover:border-blue-500',
    business: 'border-purple-500/50 hover:border-purple-500',
    galaxium: 'border-yellow-500/50 hover:border-yellow-500'
  };
  
  const selectedStyle = isSelected ? 'ring-2 ring-offset-2 ring-offset-space-black' : '';
  const disabledStyle = (isSoldOut || isDisabled) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  // Format price with commas
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US');
  };
  
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
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-500 to-orange-500 px-3 py-1 rounded-full shadow-lg">
          <span className="text-xs font-bold text-white">PREMIUM</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClassIcon className="text-cosmic-purple" size={24} />
          <h3 className="text-xl font-bold text-star-white">{displayName}</h3>
        </div>
        {isSelected && <Check className="text-alien-green" size={24} />}
      </div>
      
      {/* Description */}
      <p className="text-sm text-star-white/70 mb-4">{description}</p>
      
      {/* Price */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-star-white">
          ₡{formatPrice(availability.price)}
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
            Only {availability.seats_available} seat{availability.seats_available > 1 ? 's' : ''} left!
          </span>
        ) : (
          <span className="text-sm text-star-white/70">
            {availability.seats_available} seat{availability.seats_available > 1 ? 's' : ''} available
          </span>
        )}
      </div>
    </Card>
  );
};

// Made with Bob
