import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps {
  children: ReactNode;
  /** `link` is a quiet text action, used where a full button would shout (cancel, release). */
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const VARIANT = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  link: 'text-link inline-flex items-center gap-2',
};

const SIZE = {
  sm: 'px-4 py-2 text-[10px]',
  md: '',
  lg: 'px-7 py-3.5 text-xs',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  type = 'button',
  onClick,
}: ButtonProps) => (
  <button
    className={clsx(VARIANT[variant], variant !== 'link' && SIZE[size], className)}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    type={type}
    onClick={onClick}
  >
    {isLoading && (
      <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden />
    )}
    {children}
  </button>
);

// Made with Bob
