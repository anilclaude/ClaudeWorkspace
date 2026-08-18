import { z } from 'zod';

// Single source of truth for this service's environment. Parsed once at boot
// so a missing or malformed var crashes immediately rather than surfacing as a
// confusing runtime failure later.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive(),

  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5433),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  // The browser calls this service directly (no BFF layer), so CORS has to
  // explicitly allow the frontend's origin. Never '*' — that would allow any
  // site to call this service using a signed-in user's credentials.
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3001'),
});

export type Env = z.infer<typeof envSchema>;
