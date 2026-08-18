import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

// kind values match scripts/kit.js's badge() in the wireframes skill —
// a status pill wireframed as `kind: 'ok'` maps onto `kind="ok"` here.
export const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    kind: {
      ok: 'bg-green-100 text-green-800',
      warn: 'bg-amber-100 text-amber-800',
      err: 'bg-red-100 text-red-800',
      info: 'bg-sky-100 text-sky-800',
      neutral: 'bg-slate-100 text-slate-600',
    },
  },
  defaultVariants: { kind: 'neutral' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, kind, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ kind }), className)} {...props} />;
}
