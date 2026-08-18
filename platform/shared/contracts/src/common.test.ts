import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { apiResponseSchema, healthLiveSchema } from './common';

describe('contracts', () => {
  it('accepts a well-formed success envelope', () => {
    const schema = apiResponseSchema(z.object({ id: z.string() }));
    const parsed = schema.safeParse({ success: true, data: { id: 'x' }, error: null });
    expect(parsed.success).toBe(true);
  });

  it('rejects a success envelope carrying an error', () => {
    const schema = apiResponseSchema(z.object({ id: z.string() }));
    const parsed = schema.safeParse({
      success: true,
      data: { id: 'x' },
      error: { message: 'boom' },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a health payload with the wrong status', () => {
    expect(healthLiveSchema.safeParse({ status: 'degraded' }).success).toBe(false);
  });
});
