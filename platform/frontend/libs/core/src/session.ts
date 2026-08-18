import type { auth } from '@app/contracts';

/**
 * The session-check mechanism behind login PRD AC6 (redirect away from
 * /login when already signed in) and AC10 (session survives reload/new
 * tab). Both ACs ask the same question — "is there a currently valid
 * session right now?" — at different moments, so this is one function with
 * one caller rather than two mechanisms: T11 (originally planned as
 * separate T13/T14 tasks, regrouped 2026-08-10 since both consume this same
 * function) calls it on /login mount only.
 *
 * cr-session-guard-redirect-to-login: a second caller was added — web's
 * `useRequireSession` (frontend/web/src/lib/use-require-session.ts), which
 * calls this on mount for each of the four protected screens (dashboard,
 * menu list, add menu item, edit menu item) and redirects to /login when no
 * valid session exists, instead of letting each screen's own data fetch
 * 401 into a generic error banner.
 *
 * `backend/auth`'s `AuthService.login` (T03) signs a JWT with `env.JWT_SECRET`
 * (HS256), 24h TTL, payload `{ sub, email }`. This module decodes that
 * payload and checks its `exp` claim client-side — it deliberately never
 * verifies the HMAC signature, since doing that would require shipping the
 * server's signing secret into the browser. See DECISIONS.md (T04) for why
 * that boundary is acceptable for this PRD: AC6/AC10 gate a redirect/render
 * decision, not access to a protected resource, and this PRD has no
 * revocation/logout/refresh mechanism that could invalidate a token before
 * its `exp` — the expiry check is the entire validity contract.
 */

/** The JWT payload shape issued by `AuthService.login`. */
export interface SessionPayload {
  /** User id — `sub` claim. */
  sub: string;
  email: string;
  /** Standard JWT expiry claim: seconds since the Unix epoch. */
  exp: number;
}

export interface ActiveSession {
  valid: true;
  user: auth.LoginUser;
}

export interface NoSession {
  valid: false;
}

export type SessionCheck = ActiveSession | NoSession;

// Standard base64 alphabet — decoded by hand rather than via `atob`/`Buffer`
// so this file stays usable from any runtime this package targets (browser,
// Node, and eventually React Native/`frontend/mobile`), without reaching for
// a DOM API or a Node built-in either one would tie the package to one side.
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of padded) {
    if (char === '=') break;
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) {
      throw new Error('invalid base64 character');
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeSessionPayload(token: string): SessionPayload | null {
  const parts = token.split('.');
  // A JWT is always three dot-separated segments (header.payload.signature).
  // Anything else is malformed, not "expired" — treated identically as "no
  // session" by `checkSession`, but kept as its own branch for clarity.
  const payloadSegment = parts[1];
  if (parts.length !== 3 || payloadSegment === undefined) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(base64UrlDecode(payloadSegment));
    if (
      typeof payload === 'object' &&
      payload !== null &&
      typeof (payload as Record<string, unknown>).sub === 'string' &&
      typeof (payload as Record<string, unknown>).email === 'string' &&
      typeof (payload as Record<string, unknown>).exp === 'number'
    ) {
      return payload as SessionPayload;
    }
    return null;
  } catch {
    // Malformed base64 or malformed JSON — not a valid session either way.
    return null;
  }
}

/**
 * Is there a currently valid session? `token` is whatever the caller has
 * persisted from a prior successful login (storage mechanism is
 * `frontend/web/src/lib/session-storage.ts`'s concern, not this one).
 * Returns the signed-in user on success so callers don't need a second
 * lookup.
 *
 * **Not a security boundary.** This never verifies the JWT's HMAC
 * signature — it only decodes the payload and checks the `exp` claim
 * client-side. It must not be used to gate access to a protected
 * resource; it is redirect/render-hint only (AC6: skip the login form
 * when already signed in; AC10: on a reload/new tab, the same check on
 * /login mount re-derives the same answer from storage and redirects again;
 * cr-session-guard-redirect-to-login: `useRequireSession` runs the same
 * check on mount for the four protected screens and redirects to /login
 * when it's invalid — still a redirect/render-hint decision, not access
 * control to a resource this module itself guards). See the module header
 * and DECISIONS.md (T04) for why that boundary is acceptable for this PRD.
 */
export function checkSession(token: string | null | undefined, now: Date = new Date()): SessionCheck {
  if (!token) {
    return { valid: false };
  }

  const payload = decodeSessionPayload(token);
  if (!payload) {
    return { valid: false };
  }

  const expiresAtMs = payload.exp * 1000;
  if (expiresAtMs <= now.getTime()) {
    return { valid: false };
  }

  return { valid: true, user: { id: payload.sub, email: payload.email } };
}
