'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, value, ...props }, ref) => {
    // For number inputs, convert 0 to empty string so the field is clearable
    const displayValue = type === 'number' && (value === 0 || value === '0') ? '' : value;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-navy mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          value={displayValue}
          className={cn(
            'block w-full rounded-lg border border-border px-3 py-2 text-black placeholder-gray-400',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            'disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
