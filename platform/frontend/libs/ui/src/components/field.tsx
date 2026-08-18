import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

// Label + input + inline error, matching scripts/kit.js's field() — the same
// shape wireframes draw for every form field across every screen.
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, required, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-900">
          {label}
          {required ? (
            <span aria-hidden className="text-red-600">
              {' '}
              *
            </span>
          ) : null}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'h-10 rounded-md border px-3 text-sm text-slate-900 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-slate-400',
            error ? 'border-red-400' : 'border-slate-300',
            props.disabled ? 'bg-slate-50 text-slate-500' : 'bg-white',
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Field.displayName = 'Field';
