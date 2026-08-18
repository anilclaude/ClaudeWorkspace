import { describe, it, expect } from 'vitest';
import reducer, { setSessionToken, clearSessionToken, type SessionState } from './session.slice';

describe('session slice', () => {
  const initial: SessionState = { token: null };

  it('starts with no token', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('setSessionToken sets the token', () => {
    const next = reducer(initial, setSessionToken('a.b.c'));
    expect(next.token).toBe('a.b.c');
  });

  it('setSessionToken overwrites a previously set token', () => {
    const withFirstToken = reducer(initial, setSessionToken('a.b.c'));
    const withSecondToken = reducer(withFirstToken, setSessionToken('d.e.f'));
    expect(withSecondToken.token).toBe('d.e.f');
  });

  // cr-logout-and-back-navigation, T01 (AC1) — the new clear action.
  it('clearSessionToken clears a previously set token', () => {
    const withToken = reducer(initial, setSessionToken('a.b.c'));
    const cleared = reducer(withToken, clearSessionToken());
    expect(cleared.token).toBeNull();
  });

  it('clearSessionToken is a no-op (stays null) when no token was ever set', () => {
    const cleared = reducer(initial, clearSessionToken());
    expect(cleared.token).toBeNull();
  });
});
