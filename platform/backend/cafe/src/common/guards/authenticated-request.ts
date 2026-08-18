// Deliberately a small structural interface, not `import type { Request } from
// 'express'` — matches the existing convention in
// backend/libs/nest-kit/src/request-id.middleware.ts, keeping this module
// framework-shape-agnostic rather than pulling in Express's full Request
// surface for two fields.
export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  // Set by RolesGuard (AC3) only after the JWT signature is verified and the
  // role check passes — read from the token's `sub` claim, never from
  // anything the client sent in the body or elsewhere, so a handler can trust
  // it without re-checking.
  staffId?: string;
}
