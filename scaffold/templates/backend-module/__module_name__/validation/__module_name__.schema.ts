import { z } from 'zod';

// The source of truth for what a valid create-request looks like — matches
// how every other layer in this stack validates (env schemas, @app/contracts).
// Not class-validator: this codebase doesn't depend on it, and introducing a
// second validation library for one module would be a B6 (stack conformance)
// violation.
export const create__ModuleName__Schema = z.object({
  name: z.string().min(1),
});

export type Create__ModuleName__Input = z.infer<typeof create__ModuleName__Schema>;
