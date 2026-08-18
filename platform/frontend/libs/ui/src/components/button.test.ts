import { describe, it, expect } from 'vitest';
import { buttonVariants } from './button';

describe('buttonVariants', () => {
  it('defaults to the primary variant', () => {
    expect(buttonVariants({})).toContain('bg-slate-800');
  });

  it('produces distinct classes for secondary and destructive', () => {
    expect(buttonVariants({ variant: 'secondary' })).toContain('border-slate-300');
    expect(buttonVariants({ variant: 'destructive' })).toContain('bg-red-600');
  });
});
