import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className="eyebrow mb-2 block">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'input-field',
          error && 'border-nebula-pink/60 focus:border-nebula-pink focus:ring-nebula-pink/40',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-nebula-pink">{error}</p>
      )}
    </div>
  );
};

// Made with Bob
