import { TextInput } from '@carbon/react';
import type { TextInputProps } from '@carbon/react';
import clsx from 'clsx';

interface InputProps extends Omit<TextInputProps, 'labelText' | 'invalid' | 'invalidText'> {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
}

export const Input = ({ label, error, helperText, className, ...props }: InputProps) => {
  return (
    <div className={clsx('w-full', className)}>
      <TextInput
        labelText={label || ''}
        invalid={!!error}
        invalidText={error}
        helperText={helperText}
        {...props}
      />
    </div>
  );
};

// Made with Bob
