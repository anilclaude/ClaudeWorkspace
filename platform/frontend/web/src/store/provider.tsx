'use client';

import { useRef, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore, setCurrentStore, type AppStore } from './index';

// The store is created per-request rather than as a module singleton — a
// module-level store would be shared across requests on the server and leak
// one user's state into another's render.
//
// cr-in-memory-session — `setCurrentStore` records a reference to this
// instance for `lib/session-storage.ts`'s plain-function reads (see
// store/index.ts's comment on `getStore`/`setCurrentStore` for why this is
// safe: it's set once, synchronously, from inside this same per-instance
// creation block, not as a module-level singleton).
export function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = makeStore();
    setCurrentStore(storeRef.current);
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
