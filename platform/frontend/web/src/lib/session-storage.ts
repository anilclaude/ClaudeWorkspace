// Where the session token from a successful login (T07, AC1) is persisted
// on web, and where any later caller that needs to check for a current
// session — T11 (checkSession on /login mount, AC6) — reads it back from.
//
// cr-in-memory-session — repurposed, not removed: every existing call site
// (app/(auth)/login/page.tsx, lib/services.ts) already imports
// storeSessionToken/readSessionToken by these exact names, so keeping this
// as the one file that knows the underlying storage mechanism is the same
// shape as before — only what's behind the two functions changed, not the
// interface callers depend on. What changed: the mechanism is now the
// in-memory `session` Redux slice (store/session.slice.ts), not
// window.localStorage. See scaffold/memory/DECISIONS.md
// ("cr-in-memory-session") for the full history — `storeSessionToken`
// previously chose `localStorage` specifically *because* it survives a
// reload/new tab; this CR reverses that per an explicit user request ("dont
// store in local storage, always go with login screen"): a reload or a new
// tab must no longer restore a previous session (AC2), while normal in-app
// client-side navigation still keeps the session (AC1), since it's the same
// store instance for the lifetime of one page load (see store/provider.tsx).
//
// Deliberately NOT in @app/frontend-core: that package is platform-agnostic
// and its own module header says it may never touch the DOM/a React tree
// (mobile also consumes it, and would need its own in-memory mechanism, not
// this web app's Redux store). So the actual storage mechanism lives here,
// in the web app.
import { getStore } from '@/store';
import { setSessionToken, clearSessionToken as clearSessionTokenAction } from '@/store/session.slice';

export function storeSessionToken(token: string): void {
  const store = getStore();
  if (!store) {
    // Only reachable if this were ever called before `StoreProvider` has
    // mounted (e.g. outside the React tree entirely) — every real caller in
    // this app (login/page.tsx's submit handler) only runs after the app has
    // mounted, so this is a defensive guard, not an expected path.
    throw new Error('Session store is not initialized yet');
  }
  store.dispatch(setSessionToken(token));
}

export function readSessionToken(): string | null {
  return getStore()?.getState().session.token ?? null;
}

// cr-logout-and-back-navigation, T01 (AC1) — same shape as storeSessionToken
// above (goes through getStore(), which already fails closed server-side per
// cr-in-memory-session's rework — reused here, not duplicated): every real
// caller (a logout click handler) only runs after mount, so the "store not
// initialized" branch is the same defensive guard, not an expected path.
export function clearSessionToken(): void {
  const store = getStore();
  if (!store) {
    throw new Error('Session store is not initialized yet');
  }
  store.dispatch(clearSessionTokenAction());
}
