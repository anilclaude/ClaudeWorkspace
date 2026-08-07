import { z } from 'zod';

// Single source of truth for this service's environment. Parsed once at boot
// so a missing or malformed var crashes immediately rather than surfacing as a
// confusing runtime failure later.
//
// Add this service's own required vars here as it grows — nothing beyond
// PORT and the Postgres connection is assumed by the template.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive(),

  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5433),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
