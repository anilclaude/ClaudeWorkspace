import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionUser, displayNameFromEmail, avatarInitialsFromEmail } from './use-session-user';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';

// cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1/VC-CR-001) —
// same hand-rolled JWT-shaped token builder as use-require-session.test.ts
// (this file also runs under jsdom, so `btoa` is available).
function base64UrlEncode(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(payload: { sub: string; email: string; exp: number }): string {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlEncode(payload);
  return `${header}.${body}.fake-signature`;
}

function validToken(email: string): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub: 'user-1', email, exp });
}

describe('useSessionUser — cr-dashboard-live-identity-date-and-nav-affordance T01', () => {
  beforeEach(() => {
    setCurrentStore(makeStore());
  });

  // AC1 — no valid session (missing token): the hook resolves to `null`,
  // never throws, never redirects (it has no router dependency at all —
  // that's `useRequireSession`'s job, not this hook's).
  it('AC1 — with no session present, resolves to null', () => {
    const { result } = renderHook(() => useSessionUser());

    expect(result.current).toBeNull();
  });

  // Negative control sharing AC1's expiry boundary — an expired token must
  // not be mistaken for a valid session either.
  it('AC1 — with an expired session token, resolves to null', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    getStore()!.dispatch(setSessionToken(makeToken({ sub: 'user-1', email: 'ada@example.com', exp: expiredExp })));

    const { result } = renderHook(() => useSessionUser());

    expect(result.current).toBeNull();
  });

  // AC1/VC-CR-001 — a valid session: resolves to the real signed-in user's
  // email. The accept half of B2's accept/reject symmetry.
  it('AC1/VC-CR-001 — with a valid session, resolves to the real session email', () => {
    getStore()!.dispatch(setSessionToken(validToken('ada@example.com')));

    const { result } = renderHook(() => useSessionUser());

    expect(result.current).toEqual({ email: 'ada@example.com' });
  });
});

describe('displayNameFromEmail — cr-dashboard-live-identity-date-and-nav-affordance T01 (AC1/VC-CR-001)', () => {
  it('capitalizes the first letter of the local-part and lowercases the rest', () => {
    expect(displayNameFromEmail('admin@example.com')).toBe('Admin');
  });

  it('does not split on dots/dashes — only the first letter is capitalized', () => {
    expect(displayNameFromEmail('jane.doe@example.com')).toBe('Jane.doe');
  });
});

describe('avatarInitialsFromEmail — cr-dashboard-live-identity-date-and-nav-affordance T01 (AC1/VC-CR-001)', () => {
  it('uppercases the first two characters of the local-part', () => {
    expect(avatarInitialsFromEmail('admin@example.com')).toBe('AD');
  });

  it('produces different initials for a different email — genuinely derived, not a fixed stand-in', () => {
    expect(avatarInitialsFromEmail('jordan.lee@example.com')).toBe('JO');
    expect(avatarInitialsFromEmail('jordan.lee@example.com')).not.toBe(avatarInitialsFromEmail('admin@example.com'));
  });
});
