import { z } from 'zod';

// Placeholder shape — replace with whatever the owning service actually
// returns, matching its real contract in shared/contracts/. This is what
// api/__feature_name__.client.ts validates every response against, per
// @app/frontend-core's createApiClient — an endpoint that drifts from this
// fails here, loudly, instead of surfacing as `undefined` three components
// deep.
export const __featureName__ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const __featureName__ListSchema = z.array(__featureName__ItemSchema);

export type __FeatureName__Item = z.infer<typeof __featureName__ItemSchema>;
