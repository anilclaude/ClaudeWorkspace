import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Variant names and states mirror what the wireframes skill draws
// (scripts/kit.js's button()), so a screen built from a wireframe maps onto
// this component directly instead of an ad hoc <button> per screen.
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-slate-800 text-white hover:bg-slate-900',
        secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
