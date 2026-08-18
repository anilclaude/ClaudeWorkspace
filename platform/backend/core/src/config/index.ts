import { config as loadDotenv } from 'dotenv';
import { envSchema, type Env } from './env.schema';

loadDotenv();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud, printing every problem at once so the fix is one pass
  // rather than one restart per variable.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env: Env = parsed.data;
