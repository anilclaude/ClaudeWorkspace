// Contracts served by the auth service (:4001).

import { z } from 'zod';

export const AUTH_SERVICE = 'auth' as const;
export const AUTH_ROUTES = {
  health: '/health',
  healthLive: '/health/live',
  login: '/auth/login',
} as const;

// POST /auth/login — login PRD AC1 (success) and AC2 (uniform
// credential-mismatch error). One request shape, two response branches.

/** Request body. Shared by both the success and failure branches. */
export const loginRequestSchema = z.object({
  // 255 — standard email length ceiling.
  email: z.string().email().max(255),
  // 72 bytes — bcrypt's own hard limit; anything longer is silently
  // truncated by bcrypt itself, so capping here makes the validation
  // boundary match the actual security boundary instead of accepting an
  // unbounded string and letting bcrypt quietly drop the tail.
  password: z.string().min(1).max(72),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * User as returned to the client on a successful login. Never the raw
 * entity — no `passwordHash` leaves the service (CLAUDE.md #B5).
 */
export const loginUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});
export type LoginUser = z.infer<typeof loginUserSchema>;

/** AC1 — success payload: an active session token plus the signed-in user. */
export const loginSuccessDataSchema = z.object({
  token: z.string(),
  user: loginUserSchema,
});
export type LoginSuccessData = z.infer<typeof loginSuccessDataSchema>;

/**
 * AC2 — the message shown whether the email is unregistered or the
 * password is wrong. Never differs by cause, so the response can't be used
 * to enumerate registered accounts.
 */
export const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect' as const;

export const loginErrorSchema = z.object({
  message: z.literal(LOGIN_INVALID_CREDENTIALS_MESSAGE),
  code: z.literal('INVALID_CREDENTIALS'),
});
export type LoginError = z.infer<typeof loginErrorSchema>;

/** Full response envelope for POST /auth/login — covers AC1 and AC2. */
export const loginResponseSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: loginSuccessDataSchema, error: z.null() }),
  z.object({ success: z.literal(false), data: z.null(), error: loginErrorSchema }),
]);
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * A staff member's role within the café product suite (cafe-access-roles
 * PRD). Defined here, not in backend/cafe, per CLAUDE.md non-negotiable #6
 * ("a cross-boundary type is added to shared/contracts first, then
 * implemented against") — auth is the owning/signing service (it writes this
 * value onto the JWT at login), backend/cafe only ever consumes it. See
 * scaffold/memory/DECISIONS.md, "cafe-access-roles T00 (planning
 * resolution)", 2026-08-11, for the full reasoning on why this lives here
 * rather than in backend/libs.
 */
export const cafeRoleSchema = z.enum(['Admin', 'Manager', 'Cashier', 'Waiter', 'Kitchen']);
export type CafeRole = z.infer<typeof cafeRoleSchema>;
