import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className, hover = false, onClick }: CardProps) => {
  const Component = onClick ? motion.button : motion.div;
  
  return (
    <Component
      className={clsx(
        'glass-card p-6',
        hover && 'hover:bg-white/10 cursor-pointer',
        onClick && 'w-full text-left',
        className
      )}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

// Made with Bob
