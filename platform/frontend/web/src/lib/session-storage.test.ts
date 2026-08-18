import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkSession } from '@app/frontend-core';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';
import { readSessionToken, storeSessionToken, clearSessionToken } from './session-storage';

// cr-in-memory-session — this file now tests the in-memory (Redux) backing
// instead of localStorage. See scaffold/memory/DECISIONS.md
// ("cr-in-memory-session") for the full history.

// Hand-rolled JWT-shaped token builder, matching @app/frontend-core's own
// session.test.ts helper. That package's tsconfig has no DOM lib (by
// design — see session.ts), so it hand-rolls base64 without `btoa`; this
// file runs under jsdom (a real `window`), so `btoa` is available and kept
// simple.
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

describe('session-storage — storeSessionToken/readSessionToken round trip (in-memory)', () => {
  beforeEach(() => {
    // Simulates a fresh mount of store/provider.tsx's StoreProvider — a
    // brand-new store per test, matching what a real page load gets.
    setCurrentStore(makeStore());
  });

  it('stores in the current store and reads the same value back', () => {
    storeSessionToken('a.b.c');

    expect(getStore()?.getState().session.token).toBe('a.b.c');
    expect(readSessionToken()).toBe('a.b.c');
  });

  it('returns null when nothing has been stored', () => {
    expect(readSessionToken()).toBeNull();
  });

  // AC1 — "navigating between screens via in-app links/routing (no full
  // reload) keeps the user signed in": modeled here as two fully
  // independent `readSessionToken()` calls against the same store instance,
  // with no reset in between (the same relationship two reads from two
  // different in-app screens have to the store that survives client-side
  // routing — see store/provider.tsx).
  it('AC1: two independent reads against the same store instance both see the value a prior write stored', () => {
    storeSessionToken('a.b.c');

    const firstRead = readSessionToken();
    const secondRead = readSessionToken();

    expect(firstRead).toBe('a.b.c');
    expect(secondRead).toBe('a.b.c');
  });

  // AC2/VC-CR-002 — a fresh store (what a reload/new tab actually gets —
  // see store/provider.tsx, a new StoreProvider instance means a new
  // `makeStore()` call) never sees a token written to a *different*,
  // now-discarded store instance.
  it('AC2: a token stored in one store instance is not visible from a fresh store instance (simulated reload/new tab)', () => {
    storeSessionToken('a.b.c');
    expect(readSessionToken()).toBe('a.b.c');

    // Simulated reload/new tab: a brand-new StoreProvider mount creates a
    // brand-new store, exactly like this.
    setCurrentStore(makeStore());

    expect(readSessionToken()).toBeNull();
  });

  // Reject-branch coverage (B2 symmetry) for storeSessionToken's own
  // defensive guard — the accept branch (a normal write while a store
  // exists) is covered by the round-trip test above.
  it('storeSessionToken throws if called before any store has been set', () => {
    setCurrentStore(undefined as never);

    expect(() => storeSessionToken('a.b.c')).toThrow('Session store is not initialized yet');
  });

  it('readSessionToken returns null (not a throw) if called before any store has been set', () => {
    setCurrentStore(undefined as never);

    expect(readSessionToken()).toBeNull();
  });
});

// cr-logout-and-back-navigation, T01 (AC1) — clearSessionToken follows the
// exact same shape as storeSessionToken above (same getStore() call, same
// fail-closed guard), so its own coverage mirrors storeSessionToken's.
describe('session-storage — clearSessionToken (in-memory)', () => {
  beforeEach(() => {
    setCurrentStore(makeStore());
  });

  it('clears a previously stored token so a subsequent read sees null', () => {
    storeSessionToken('a.b.c');
    expect(readSessionToken()).toBe('a.b.c');

    clearSessionToken();

    expect(readSessionToken()).toBeNull();
    expect(getStore()?.getState().session.token).toBeNull();
  });

  // Reject-branch coverage (B2 symmetry) — same guard storeSessionToken has.
  it('throws if called before any store has been set', () => {
    setCurrentStore(undefined as never);

    expect(() => clearSessionToken()).toThrow('Session store is not initialized yet');
  });
});

// cr-in-memory-session (rework, reviewer cycle 1 SHOULD-FIX) — the fail-closed
// guard added to store/index.ts's getStore() (server-side calls return
// undefined, never a stale cross-request store reference) must actually
// propagate through these two functions, not just through getStore() in
// isolation.
describe('session-storage — fails closed when called server-side (no window)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('readSessionToken returns null server-side, even though a real token was stored in the current store', () => {
    setCurrentStore(makeStore());
    storeSessionToken('a.b.c');
    expect(readSessionToken()).toBe('a.b.c');

    vi.stubGlobal('window', undefined);

    expect(readSessionToken()).toBeNull();
  });

  it('storeSessionToken throws server-side rather than silently writing to a stale cross-request store', () => {
    setCurrentStore(makeStore());
    vi.stubGlobal('window', undefined);

    expect(() => storeSessionToken('a.b.c')).toThrow('Session store is not initialized yet');
  });

  // cr-logout-and-back-navigation, T01 (AC1) — same fail-closed guard,
  // propagated through clearSessionToken exactly like the two functions
  // above.
  it('clearSessionToken throws server-side rather than silently clearing a stale cross-request store', () => {
    setCurrentStore(makeStore());
    vi.stubGlobal('window', undefined);

    expect(() => clearSessionToken()).toThrow('Session store is not initialized yet');
  });
});

// VC-CR-001 — after login, window.localStorage/sessionStorage must never be
// touched for the session token, at any point.
describe('session-storage — VC-CR-001, never touches window.localStorage/sessionStorage', () => {
  it('storeSessionToken/readSessionToken never call Storage.prototype.setItem/getItem', () => {
    setCurrentStore(makeStore());
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    storeSessionToken('a.b.c');
    readSessionToken();

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
  });
});

// checkSession(readSessionToken()) still validates correctly through the
// new in-memory storage mechanism — this is the same pure-function contract
// T11 originally proved against localStorage; only what feeds it changed.
// (AC10's reload/new-tab persistence claim itself is superseded by this CR
// — see login/page.test.tsx's own AC2 coverage for that half.)
describe('checkSession(readSessionToken()) — validity/expiry through the in-memory store', () => {
  beforeEach(() => {
    setCurrentStore(makeStore());
  });

  it('a valid, unexpired token stored in the current store reads as a valid session', () => {
    const oneHourFromNowSeconds = Math.floor(Date.now() / 1000) + 3600;
    storeSessionToken(
      makeToken({ sub: 'user-1', email: 'ada@example.com', exp: oneHourFromNowSeconds }),
    );

    const result = checkSession(readSessionToken());

    expect(result).toEqual({ valid: true, user: { id: 'user-1', email: 'ada@example.com' } });
  });

  it('an expired token stored in the current store reads as no session, even though it is still present in the store', () => {
    const oneHourAgoSeconds = Math.floor(Date.now() / 1000) - 3600;
    storeSessionToken(makeToken({ sub: 'user-1', email: 'ada@example.com', exp: oneHourAgoSeconds }));

    expect(getStore()?.getState().session.token).not.toBeNull();
    expect(checkSession(readSessionToken())).toEqual({ valid: false });
  });

  it('with no session ever established, checkSession correctly shows no session', () => {
    expect(checkSession(readSessionToken())).toEqual({ valid: false });
  });

  it('setSessionToken action directly dispatched (not via storeSessionToken) is also picked up by readSessionToken', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ sub: 'user-1', email: 'ada@example.com', exp });

    getStore()!.dispatch(setSessionToken(token));

    expect(readSessionToken()).toBe(token);
  });
});
