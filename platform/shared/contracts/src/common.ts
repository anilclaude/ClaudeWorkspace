import { z } from 'zod';

/** Consistent envelope for every service response. */
export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

export function apiResponseSchema<T extends z.ZodTypeAny>(data: T) {
  return z.discriminatedUnion('success', [
    z.object({ success: z.literal(true), data, error: z.null() }),
    z.object({ success: z.literal(false), data: z.null(), error: apiErrorSchema }),
  ]);
}

export type ApiError = z.infer<typeof apiErrorSchema>;

/** Health, served identically by every service. */
export const healthLiveSchema = z.object({ status: z.literal('ok') });
export type HealthLive = z.infer<typeof healthLiveSchema>;
