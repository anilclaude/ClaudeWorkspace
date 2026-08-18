import { describe, it, expect } from 'vitest';
import { badgeVariants } from './badge';

describe('badgeVariants', () => {
  it('defaults to neutral', () => {
    expect(badgeVariants({})).toContain('bg-slate-100');
  });

  it('maps each kind to a visually distinct class set', () => {
    const kinds = ['ok', 'warn', 'err', 'info', 'neutral'] as const;
    const classes = kinds.map((kind) => badgeVariants({ kind }));
    expect(new Set(classes).size).toBe(kinds.length);
  });
});
