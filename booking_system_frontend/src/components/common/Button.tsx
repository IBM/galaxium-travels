import { Button as CarbonButton, ButtonProps as CarbonButtonProps } from '@carbon/react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) => {
  // Map custom variants to Carbon kinds
  const carbonKind: CarbonButtonProps['kind'] = 
    variant === 'primary' ? 'primary' :
    variant === 'danger' ? 'danger' :
    'secondary';

  // Map custom sizes to Carbon sizes
  const carbonSize: CarbonButtonProps['size'] = 
    size === 'sm' ? 'sm' :
    size === 'lg' ? 'lg' :
    'md';

  return (
    <motion.div
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={clsx('inline-block', className)}
    >
      <CarbonButton
        kind={carbonKind}
        size={carbonSize}
        disabled={disabled || isLoading}
        type={type}
        onClick={onClick}
        className="w-full"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 mr-2 inline-block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </CarbonButton>
    </motion.div>
  );
};

// Made with Bob
