import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './ui.slice';
import sessionReducer from './session.slice';

// Root store. Feature modules register their own slices here as they land —
// import the reducer from src/modules/<feature>/store/ and add it below.
export const makeStore = () =>
  configureStore({
    reducer: {
      ui: uiReducer,
      session: sessionReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

// cr-in-memory-session — a reference to whichever `AppStore` instance is
// currently live, for the one caller that legitimately needs to read store
// state as a plain function rather than a React hook: `lib/session-storage.ts`
// (in turn used by `lib/services.ts`'s `cafeService()`, which is called
// fresh on every request, outside any component). See
// scaffold/memory/DECISIONS.md ("cr-in-memory-session") for why the *store
// itself* is not a module-level singleton: `store/provider.tsx` still
// creates a brand-new store per `StoreProvider` instance exactly as before
// (preserving the "no state shared across SSR requests" property
// `StoreProvider`'s own comment already documented) — `setCurrentStore` is
// called synchronously from inside that same per-instance creation, during
// render, not from an effect. React renders a parent (`StoreProvider`)
// before any descendant, so by the time any descendant's effect or event
// handler could call `getStore()`, the reference is already set; a
// lazily-created, import-time singleton would not have that ordering
// guarantee and would also reintroduce the cross-SSR-request risk.
//
// The `currentStore` *variable* below is still, unavoidably, a genuine
// module-level singleton in the Node.js server process (there is exactly one
// module instance per server, shared across every concurrent request) — see
// `getStore()`'s own guard immediately below for why that only matters for a
// hypothetical future server-side caller, not for anything that calls it
// today.
let currentStore: AppStore | undefined;

export function setCurrentStore(nextStore: AppStore): void {
  currentStore = nextStore;
}

// cr-in-memory-session (rework, reviewer cycle 1 SHOULD-FIX) — fail closed if
// ever called server-side. Nothing calls `getStore()` during SSR today: every
// real caller (session-storage.ts, in turn called from login/page.tsx's
// submit handler and services.ts's cafeService()) only runs inside a
// useEffect or an event handler, both client-only. But `currentStore` is a
// genuine module-level singleton in the Node.js server process — nothing
// structurally stops a *future* caller from reading it from a render body on
// the server, where it would silently return whichever concurrent request's
// store happened to be `currentStore` last (a cross-user token leak). This
// guard closes that off without changing any current behavior: `typeof
// window === 'undefined'` is true only on the server, never in a real
// browser tab, so every existing (client-only) call site is unaffected.
export function getStore(): AppStore | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return currentStore;
}
