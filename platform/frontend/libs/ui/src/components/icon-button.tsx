import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

// A minimal icon-only interactive primitive. @app/ui had no icon-button
// before this (login PRD T10, AC7 — the password visibility toggle):
// `Button` is sized/variant-styled for full-width, labelled actions ("Sign
// in", etc.), and turning it into a small, absolutely-positioned,
// icon-only overlay control would mean fighting its own height/padding/
// background defaults with overrides at every call site rather than having
// a primitive built for that shape. See scaffold/memory/DECISIONS.md ("T10")
// for the PROCEED record of choosing this over a bare raw `<button>` written
// directly in the consuming page.
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name for the icon-only control — required, since an icon
   *  alone conveys nothing to a screen reader. Used as `aria-label` unless
   *  the caller passes an explicit `aria-label` (e.g. to make it dynamic,
   *  as the password toggle does for "Show password" / "Hide password"). */
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, 'aria-label': ariaLabel, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel ?? label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400',
        'transition-colors hover:text-slate-600',
        'focus:outline-none focus:ring-2 focus:ring-slate-400',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';
