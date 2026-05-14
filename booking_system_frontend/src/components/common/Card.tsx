import type { ReactNode } from 'react';
import { Tile } from '@carbon/react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className, hover = false, onClick }: CardProps) => {
  return (
    <Tile
      className={clsx(
        'carbon-card',
        hover && 'carbon-card-hover cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Tile>
  );
};

// Made with Bob
