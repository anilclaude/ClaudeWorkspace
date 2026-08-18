import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequireSession } from './use-require-session';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';

// cr-session-guard-redirect-to-login, T01 (AC1-AC3) — `next/navigation`'s
// `useRouter` is mocked rather than exercised for real, mirroring
// app/(auth)/login/page.test.tsx's own T11 mount-check suite (same
// underlying `checkSession`/`readSessionToken` mechanism, just consumed by
// a hook instead of a page component here). `readSessionToken` itself is
// NOT mocked — the store is seeded directly (same pattern login/
// page.test.tsx's AC6 suite uses) so this exercises the real
// checkSession/readSessionToken pair, not a stand-in for it.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Hand-rolled JWT-shaped token builder — same shape as login/page.test.tsx's
// own helper (this file also runs under jsdom, so `btoa` is available).
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

function validToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return makeToken({ sub: 'user-1', email: 'ada@example.com', exp });
}

describe('useRequireSession — cr-session-guard-redirect-to-login T01', () => {
  beforeEach(() => {
    pushMock.mockReset();
    // A fresh, empty store per test — the in-memory equivalent of a real
    // fresh StoreProvider mount (see store/provider.tsx), matching login/
    // page.test.tsx's own file-wide beforeEach.
    setCurrentStore(makeStore());
  });

  // AC1 — no valid session (missing token): redirects to /login, and the
  // hook's return value stays false. This is the "no session" branch B2's
  // accept/reject symmetry requires alongside AC2's accept case below.
  it('AC1 — with no session present, redirects to /login and the hook returns false', () => {
    const { result } = renderHook(() => useRequireSession());

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(result.current).toBe(false);
  });

  // Negative control sharing AC1's expiry boundary — a token that decodes
  // but has already expired must not be mistaken for a valid session
  // either: same redirect, same false return.
  it('AC1 — with an expired session token, redirects to /login and the hook returns false', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    getStore()!.dispatch(
      setSessionToken(makeToken({ sub: 'user-1', email: 'ada@example.com', exp: expiredExp })),
    );

    const { result } = renderHook(() => useRequireSession());

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(result.current).toBe(false);
  });

  // AC2 — a valid session: no redirect fires, and the hook's return value
  // becomes true. The accept half of B2's accept/reject symmetry.
  it('AC2 — with a valid session, does not redirect and the hook returns true', () => {
    getStore()!.dispatch(setSessionToken(validToken()));

    const { result } = renderHook(() => useRequireSession());

    expect(pushMock).not.toHaveBeenCalled();
    expect(result.current).toBe(true);
  });
});
