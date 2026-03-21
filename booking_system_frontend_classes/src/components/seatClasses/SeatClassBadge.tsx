import { Star, Sparkles } from 'lucide-react';
import type { SeatClassName } from '../../types';

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

// Made with Bob
