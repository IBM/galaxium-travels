import type { InputHTMLAttributes } from 'react';
import { TextInput } from '@carbon/react';
import clsx from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, id, ...props }: InputProps) => {
  // Generate a unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={clsx('w-full', className)}>
      <TextInput
        id={inputId}
        labelText={label || ''}
        invalid={!!error}
        invalidText={error}
        {...props}
      />
    </div>
  );
};

// Made with Bob
