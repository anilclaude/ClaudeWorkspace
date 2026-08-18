import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore, setCurrentStore, type AppStore } from '@/store';
import { storeSessionToken, readSessionToken } from '@/lib/session-storage';
import { AppShell } from './app-shell';

// cr-logout-and-back-navigation, T01 (AC1, AC2) — AppShell is the shared
// chrome behind /menu, /menu/new, and /menu/[id]/edit (via
// src/app/(app)/layout.tsx), so testing it directly here covers all three
// routes' logout/back-arrow behavior in one place, matching
// dashboard-screen.test.tsx's equivalent coverage for the other chrome
// surface.
const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}));

const NAV_ITEMS = [{ href: '/menu', label: 'Menu' }];

describe('AppShell', () => {
  let store: AppStore;

  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    // AppShell reads/dispatches the `ui` slice via react-redux hooks (needs
    // a real <Provider>), while session-storage.ts's clearSessionToken/
    // storeSessionToken/readSessionToken read the same instance through
    // store/index.ts's module-level getStore()/setCurrentStore() reference
    // — both must point at the same store instance for this test's
    // assertions to mean anything.
    store = makeStore();
    setCurrentStore(store);
  });

  // AC1/VC-CR-001 — clicking logout clears the in-memory session and
  // navigates to /login.
  it('AC1/VC-CR-001 — clicking the logout control clears the session and navigates to /login', () => {
    storeSessionToken('a.b.c');
    render(
      <Provider store={store}>
        <AppShell navItems={NAV_ITEMS}>
          <p>page content</p>
        </AppShell>
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(readSessionToken()).toBeNull();
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  // AC2/VC-CR-002 — the back arrow calls the router's own back navigation,
  // not a push/replace to a fixed destination.
  it('AC2/VC-CR-002 — the back arrow calls router.back(), not push/replace to a fixed path', () => {
    render(
      <Provider store={store}>
        <AppShell navItems={NAV_ITEMS}>
          <p>page content</p>
        </AppShell>
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(backMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
