import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeStore, setCurrentStore, getStore } from './index';

// cr-in-memory-session (rework, reviewer cycle 1 SHOULD-FIX) — `getStore()`
// must fail closed (return undefined) when called with no `window` (i.e.
// server-side), rather than silently returning whichever `currentStore`
// reference happens to be set in the Node.js server process — that
// reference could belong to a different, concurrent request.
describe('store/index — getStore() fails closed when called server-side', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accept: returns the current store when window is defined (real browser tab)', () => {
    const store = makeStore();
    setCurrentStore(store);

    expect(getStore()).toBe(store);
  });

  it('reject: returns undefined when window is undefined (server-side), even though a store reference is set', () => {
    const store = makeStore();
    setCurrentStore(store);

    vi.stubGlobal('window', undefined);

    expect(getStore()).toBeUndefined();
  });
});
