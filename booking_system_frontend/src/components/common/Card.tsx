import type { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className, hover = false, onClick }: CardProps) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={clsx(
        'glass-card p-6',
        hover && 'cursor-pointer transition-colors hover:border-white/20 hover:bg-white/5',
        onClick && 'w-full text-left',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

// Made with Bob
