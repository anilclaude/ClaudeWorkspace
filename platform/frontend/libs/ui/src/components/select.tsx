import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
}

// Label + native <select> + inline error, mirroring Field's shape exactly
// (same label/spacing/required-marker/error-slot classes) so a select field
// reads as the same visual family as every text Field on any screen. Like
// Field, `required` only drives the visual `*` marker — it is not forwarded
// to the native `required` attribute, since every form in this codebase
// validates manually (`noValidate`) rather than relying on native HTML
// constraint validation.
//
// @app/ui had no select primitive before this (cafe-menu-management T08,
// AC5's category dropdown — the first single-select field in this codebase).
// Field itself can't be widened to cover this: its own type
// (InputHTMLAttributes<HTMLInputElement>) is input-only. Added as a proper
// shared primitive rather than raw <select> markup written directly into the
// consuming form, the same reasoning IconButton's own addition (login PRD
// T10) already established for this library — see
// scaffold/memory/DECISIONS.md ("cafe-menu-management T08").
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, className, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-semibold text-slate-900">
          {label}
          {required ? (
            <span aria-hidden className="text-red-600">
              {' '}
              *
            </span>
          ) : null}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={cn(
            'h-10 rounded-md border px-3 text-sm text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-slate-400',
            error ? 'border-red-400' : 'border-slate-300',
            props.disabled ? 'bg-slate-50 text-slate-500' : 'bg-white',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p id={`${selectId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = 'Select';
