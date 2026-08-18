import { describe, it, expect } from 'vitest';
import { checkSession } from './session';

// Hand-rolled to match session.ts's hand-rolled decoder (no `atob`/`btoa` —
// this package's tsconfig has no DOM lib, by design; see session.ts).
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Url(input: string): string {
  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const byte1 = input.charCodeAt(i) & 0xff;
    const byte2 = i + 1 < input.length ? input.charCodeAt(i + 1) & 0xff : undefined;
    const byte3 = i + 2 < input.length ? input.charCodeAt(i + 2) & 0xff : undefined;

    // Indices are always 0-63 (6-bit values into a 64-char alphabet), so the
    // non-null assertions are safe — `noUncheckedIndexedAccess` just can't
    // prove that from the bit arithmetic.
    output += BASE64_CHARS[byte1 >> 2]!;
    output += BASE64_CHARS[((byte1 & 0x03) << 4) | (byte2 === undefined ? 0 : byte2 >> 4)]!;
    output += byte2 === undefined ? '' : BASE64_CHARS[((byte2 & 0x0f) << 2) | (byte3 === undefined ? 0 : byte3 >> 6)]!;
    output += byte3 === undefined ? '' : BASE64_CHARS[byte3 & 0x3f]!;
  }
  return output.replace(/\+/g, '-').replace(/\//g, '_');
}

/** Builds a JWT-shaped string with an arbitrary payload. Signature is never
 * verified by `checkSession` (see session.ts / DECISIONS.md T04), so the
 * "signature" segment here is a placeholder, not a real HMAC. */
function makeToken(payload: unknown): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(typeof payload === 'string' ? payload : JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('checkSession — AC6/AC10 shared session-validity mechanism', () => {
  const now = new Date('2026-08-09T12:00:00Z');
  const oneHourFromNow = Math.floor(now.getTime() / 1000) + 3600;
  const oneHourAgo = Math.floor(now.getTime() / 1000) - 3600;

  // AC6: redirect away from /login only when a session actually exists and
  // hasn't expired. AC10: reload/new-tab must keep the same session alive.
  it('AC6/AC10 — recognizes an unexpired token as a valid session and returns its user', () => {
    const token = makeToken({ sub: 'user-1', email: 'ada@example.com', exp: oneHourFromNow });

    const result = checkSession(token, now);

    expect(result).toEqual({ valid: true, user: { id: 'user-1', email: 'ada@example.com' } });
  });

  // AC10: "until the session expires" — an expired token must not read as signed in.
  it('AC10 — rejects a token whose exp claim is in the past', () => {
    const token = makeToken({ sub: 'user-1', email: 'ada@example.com', exp: oneHourAgo });

    expect(checkSession(token, now)).toEqual({ valid: false });
  });

  // AC6: with no session at all (fresh browser), /login must render its form,
  // i.e. checkSession must not treat "nothing there" as valid.
  it('AC6 — rejects a null/undefined token (no session present)', () => {
    expect(checkSession(null, now)).toEqual({ valid: false });
    expect(checkSession(undefined, now)).toEqual({ valid: false });
  });

  // A malformed token must never be mistaken for a valid or "close enough" session.
  it('rejects a malformed token (not a three-segment JWT)', () => {
    expect(checkSession('not-a-jwt', now)).toEqual({ valid: false });
  });

  it('rejects a token whose payload segment is not valid base64/JSON', () => {
    const token = 'aGVhZGVy.not-valid-base64url-json!!!.sig';

    expect(checkSession(token, now)).toEqual({ valid: false });
  });

  it('rejects a token whose payload is valid JSON but missing required claims', () => {
    const token = makeToken({ sub: 'user-1' }); // no email, no exp

    expect(checkSession(token, now)).toEqual({ valid: false });
  });

  // Boundary: exp is "seconds since epoch, session valid until it expires" —
  // a token expiring at exactly `now` should no longer be treated as active.
  it('treats a token expiring at exactly `now` as no longer valid', () => {
    const token = makeToken({
      sub: 'user-1',
      email: 'ada@example.com',
      exp: Math.floor(now.getTime() / 1000),
    });

    expect(checkSession(token, now)).toEqual({ valid: false });
  });

  // None of the tests above ever produce a `-` or `_` in the encoded
  // payload segment, so `base64UrlDecode`'s URL-safe substitution
  // (`.replace(/-/g, '+').replace(/_/g, '/')`) is otherwise never
  // exercised — it could be deleted or reversed and every other test here
  // would still pass. These two `email` values are engineered so the
  // *standard* base64 encoding of the JSON payload contains a `+` and a
  // `/` respectively at that byte alignment; `base64Url()` above then
  // rewrites those into `-` and `_` (the actual JWT wire format), so
  // decoding only succeeds if `checkSession` correctly reverses that
  // substitution before decoding.
  it('decodes a payload whose base64 contains a URL-unsafe `+` character', () => {
    const email = ' >@example.com'; // standard base64 of the JSON payload contains '+'
    expect(base64Url(JSON.stringify({ sub: 'user-1', email, exp: oneHourFromNow }))).toContain('-');

    const token = makeToken({ sub: 'user-1', email, exp: oneHourFromNow });

    expect(checkSession(token, now)).toEqual({ valid: true, user: { id: 'user-1', email } });
  });

  it('decodes a payload whose base64 contains a URL-unsafe `/` character', () => {
    const email = ' ?@example.com'; // standard base64 of the JSON payload contains '/'
    expect(base64Url(JSON.stringify({ sub: 'user-1', email, exp: oneHourFromNow }))).toContain('_');

    const token = makeToken({ sub: 'user-1', email, exp: oneHourFromNow });

    expect(checkSession(token, now)).toEqual({ valid: true, user: { id: 'user-1', email } });
  });
});
