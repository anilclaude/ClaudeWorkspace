import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { cafe } from '@app/contracts';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';
import { readSessionToken, clearSessionToken } from '@/lib/session-storage';
import { AddMenuItemScreen } from './add-menu-item-screen';

// cr-add-menu-category-options T01 (AC1, AC2) — the screen behind
// `/menu/new`: fetches GET /menu/categories and renders loading/error/ready
// states (B7), mirroring edit-menu-item-screen.test.tsx's own shape for an
// equivalent fetch. `cafeService()` is mocked (its `get` method) rather
// than exercised for real — this suite is about what AddMenuItemScreen
// does with the fetched categories, not the contract-validated HTTP client
// itself.
const getMock = vi.fn();
vi.mock('@/lib/services', () => ({
  cafeService: () => ({ get: getMock, post: vi.fn() }),
}));

// cr-session-guard-redirect-to-login, T01 — this screen now calls
// useRequireSession() on mount, which calls next/navigation's useRouter().
// Mocked the same way login/page.test.tsx's own T11 suite does.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const fixtureCategories: cafe.MenuCategory[] = [
  { id: 'cat-1', name: 'Starters', sortOrder: 0 },
  { id: 'cat-2', name: 'Mains', sortOrder: 1 },
];

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

describe('AddMenuItemScreen', () => {
  beforeEach(() => {
    getMock.mockReset();
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
  // screen's own categories fetch, and the existing generic
  // LOAD_ERROR_MESSAGE banner never appears.
  it('AC1 — with no session, redirects to /login instead of fetching or showing the generic error banner', () => {
    clearSessionToken();
    expect(readSessionToken()).toBeNull();

    render(<AddMenuItemScreen />);

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Something went wrong loading categories. Try again.')).toBeNull();
  });

  it('shows a loading state while the categories fetch is in flight', () => {
    getMock.mockReturnValue(new Promise(() => {})); // never resolves within this test
    render(<AddMenuItemScreen />);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText(/loading categories/i)).toBeDefined();
  });

  it('shows an error state when the fetch itself fails (network error / non-2xx / contract mismatch)', async () => {
    getMock.mockRejectedValue(new Error('network error'));
    render(<AddMenuItemScreen />);

    await screen.findByRole('alert');
    expect(screen.getByText('Something went wrong loading categories. Try again.')).toBeDefined();
  });

  it('shows an error state when the response reports success: false', async () => {
    getMock.mockResolvedValue({ success: false, data: null, error: { message: 'nope' } });
    render(<AddMenuItemScreen />);

    await screen.findByRole('alert');
    expect(screen.getByText('Something went wrong loading categories. Try again.')).toBeDefined();
  });

  // AC1, VC-CR-001 — once loaded, the real Add Menu Item form renders with
  // every fetched category as a real <option> (exact count, not "at least
  // one").
  it('AC1/VC-CR-001 — renders the Add Menu Item form with exactly N real category options once categories load', async () => {
    getMock.mockResolvedValue({ success: true, data: fixtureCategories, error: null });
    render(<AddMenuItemScreen />);

    await screen.findByText('Add Menu Item');
    const category = screen.getByLabelText(/category/i) as HTMLSelectElement;
    // Placeholder + N real options = fixtureCategories.length + 1.
    expect(category.options).toHaveLength(fixtureCategories.length + 1);
    expect(within(category).getByText('Starters')).toBeDefined();
    expect(within(category).getByText('Mains')).toBeDefined();
  });
});
