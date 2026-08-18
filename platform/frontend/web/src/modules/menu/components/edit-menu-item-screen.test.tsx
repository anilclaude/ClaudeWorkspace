import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { cafe } from '@app/contracts';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';
import { readSessionToken, clearSessionToken } from '@/lib/session-storage';
import { EditMenuItemScreen } from './edit-menu-item-screen';

// T11 (AC3, AC4) — the screen behind /menu/[id]/edit: fetches
// GET /menu/categories + GET /menu/items (T10's own pattern, no single-item
// GET endpoint exists), finds the item by id client-side, and renders
// loading/error/not-found/ready states (B7). `cafeService()` is mocked
// (its `get`/`patch` methods) rather than exercised for real — this suite
// is about what EditMenuItemScreen does with the fetched list, not the
// contract-validated HTTP client itself.
const getMock = vi.fn();
const patchMock = vi.fn();
vi.mock('@/lib/services', () => ({
  cafeService: () => ({ get: getMock, patch: patchMock }),
}));

// cr-session-guard-redirect-to-login, T01 — this screen now calls
// useRequireSession() on mount, which calls next/navigation's useRouter().
// Mocked the same way login/page.test.tsx's own T11 suite does.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const fixtureItem: cafe.MenuItem = {
  id: 'item-1',
  categoryId: 'cat-2',
  name: 'Garlic Bread',
  description: null,
  price: 6.5,
  isAvailable: true,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const fixtureCategories: cafe.MenuCategory[] = [
  { id: 'cat-1', name: 'Starters', sortOrder: 0 },
  { id: 'cat-2', name: 'Mains', sortOrder: 1 },
];

function mockLoadedList(items: cafe.MenuItem[], categories: cafe.MenuCategory[] = fixtureCategories) {
  getMock.mockImplementation((path: string) => {
    if (path === cafe.CAFE_ROUTES.categories) {
      return Promise.resolve({ success: true, data: categories, error: null });
    }
    return Promise.resolve({ success: true, data: items, error: null });
  });
}

// cr-session-guard-redirect-to-login, T01 — this screen's mount-fetch
// effect is now gated behind useRequireSession, so every test below that
// exercises the fetch needs a real, unexpired JWT-shaped token seeded into
// the store before render. Same hand-rolled token shape login/
// page.test.tsx's own T11 suite uses (this file also runs under jsdom, so
// `btoa` is available).
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

describe('EditMenuItemScreen', () => {
  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
    pushMock.mockReset();
    setCurrentStore(makeStore());
    // cr-session-guard-redirect-to-login, T01 (AC2) — a valid session by
    // default so every existing test below keeps exercising the real fetch
    // path unchanged; the new AC1 "no session" test below explicitly clears
    // this before rendering instead.
    getStore()!.dispatch(setSessionToken(validToken()));
  });

  // cr-session-guard-redirect-to-login, T01 (AC1) — mounting with no valid
  // session redirects straight to /login instead of ever firing this
  // screen's own categories/items fetch, and the existing generic
  // LOAD_ERROR_MESSAGE banner never appears.
  it('AC1 — with no session, redirects to /login instead of fetching or showing the generic error banner', () => {
    clearSessionToken();
    expect(readSessionToken()).toBeNull();

    render(<EditMenuItemScreen itemId="item-1" />);

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Something went wrong loading this item. Try again.')).toBeNull();
  });

  it('shows a loading state while the categories/items fetch is in flight', () => {
    getMock.mockReturnValue(new Promise(() => {})); // never resolves within this test
    render(<EditMenuItemScreen itemId="item-1" />);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText(/loading item/i)).toBeDefined();
  });

  it('shows an error state when the fetch itself fails (network error / non-2xx / contract mismatch)', async () => {
    getMock.mockRejectedValue(new Error('network error'));
    render(<EditMenuItemScreen itemId="item-1" />);

    await screen.findByRole('alert');
    expect(screen.getByText('Something went wrong loading this item. Try again.')).toBeDefined();
  });

  it('shows a not-found state when no item in the list matches the id in the URL (stale/bad id)', async () => {
    mockLoadedList([fixtureItem]); // fixtureItem.id === 'item-1'
    render(<EditMenuItemScreen itemId="does-not-exist" />);

    await screen.findByText('This menu item could not be found.');
    expect(screen.getByRole('link', { name: /back to menu/i })).toBeDefined();
  });

  it('finds the item by id and renders the pre-filled edit form once loaded', async () => {
    mockLoadedList([fixtureItem]);
    render(<EditMenuItemScreen itemId="item-1" />);

    await screen.findByText('Edit Menu Item');
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Garlic Bread');
    expect((screen.getByLabelText(/category/i) as HTMLSelectElement).value).toBe('cat-2');
  });
});
