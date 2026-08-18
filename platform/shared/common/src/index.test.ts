import { describe, it, expect } from 'vitest';
import { normalizeEmail, backoffMs } from './index';

describe('common', () => {
  it('normalizes email case and whitespace', () => {
    expect(normalizeEmail('  Sam@Example.COM ')).toBe('sam@example.com');
  });

  it('grows backoff exponentially and respects the cap', () => {
    expect(backoffMs(1)).toBe(200);
    expect(backoffMs(2)).toBe(400);
    expect(backoffMs(99)).toBe(5000);
  });
});
