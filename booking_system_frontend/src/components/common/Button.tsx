import { Button as CarbonButton } from '@carbon/react';
import clsx from 'clsx';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'tertiary' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
  const kind = variant === 'danger' ? 'danger' : variant;
  
  const sizeMap = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    '2xl': '2xl',
  } as const;

  return (
    <CarbonButton
      kind={kind}
      size={sizeMap[size]}
      className={clsx(className)}
      disabled={disabled || isLoading}
      type={type}
      onClick={onClick}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
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
        </div>
      ) : (
        children
      )}
    </CarbonButton>
  );
};

// Made with Bob
