import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { cafe } from '@app/contracts';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';
import { readSessionToken, clearSessionToken } from '@/lib/session-storage';
import { MenuListScreen } from './menu-list-screen';

// T10 (AC3, AC5, AC6 display half) — the admin menu list, matching
// docs/wireframes/cafe-menu-management/cafe-menu-list-default.png.
// `cafeService()` is mocked (its `get` method) — this suite is about what
// MenuListScreen does with the categories/items responses (grouping,
// ordering, badge state, loading/error/empty), not about the
// contract-validated HTTP client itself (its own coverage, including the
// new Authorization-header behavior, lives in @app/frontend-core's
// api-client.test.ts).
const getMock = vi.fn();
vi.mock('@/lib/services', () => ({
  cafeService: () => ({ get: getMock }),
}));

// cr-session-guard-redirect-to-login, T01 — this screen now calls
// useRequireSession() on mount, which calls next/navigation's useRouter().
// Mocked the same way login/page.test.tsx's own T11 suite does.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

function categoriesResponse(categories: cafe.MenuCategory[]) {
  return { success: true, data: categories, error: null };
}

function itemsResponse(items: cafe.MenuItem[]) {
  return { success: true, data: items, error: null };
}

function item(overrides: Partial<cafe.MenuItem> & Pick<cafe.MenuItem, 'id' | 'categoryId' | 'name' | 'price'>): cafe.MenuItem {
  return {
    description: null,
    isAvailable: true,
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Matches cafe-menu-list-default.png's own data exactly (category order and
// item order, including Veg Burger's Unavailable badge).
const STARTERS: cafe.MenuCategory = { id: 'cat-starters', name: 'STARTERS', sortOrder: 0 };
const MAINS: cafe.MenuCategory = { id: 'cat-mains', name: 'MAINS', sortOrder: 1 };
const BEVERAGES: cafe.MenuCategory = { id: 'cat-beverages', name: 'BEVERAGES', sortOrder: 2 };

const springRolls = item({ id: 'item-1', categoryId: 'cat-starters', name: 'Spring Rolls', price: 5 });
const garlicBread = item({ id: 'item-2', categoryId: 'cat-starters', name: 'Garlic Bread', price: 4 });
const grilledChicken = item({ id: 'item-3', categoryId: 'cat-mains', name: 'Grilled Chicken', price: 12 });
const vegBurger = item({ id: 'item-4', categoryId: 'cat-mains', name: 'Veg Burger', price: 9, isAvailable: false });
const icedTea = item({ id: 'item-5', categoryId: 'cat-beverages', name: 'Iced Tea', price: 3 });

function mockSuccess(categories: cafe.MenuCategory[], items: cafe.MenuItem[]) {
  getMock.mockImplementation((path: string) => {
    if (path === cafe.CAFE_ROUTES.categories) return Promise.resolve(categoriesResponse(categories));
    if (path === cafe.CAFE_ROUTES.items) return Promise.resolve(itemsResponse(items));
    throw new Error(`unexpected path: ${path}`);
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

describe('MenuListScreen', () => {
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
  // screen's own categories/items fetch, and the existing generic
  // LOAD_ERROR_MESSAGE banner never appears.
  it('AC1 — with no session, redirects to /login instead of fetching or showing the generic error banner', () => {
    clearSessionToken();
    expect(readSessionToken()).toBeNull();

    render(<MenuListScreen />);

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Something went wrong loading the menu. Try again.')).toBeNull();
  });

  it('title/subtitle/"+ Add Item" render, and Add Item links to /menu/new', async () => {
    mockSuccess([STARTERS], [springRolls]);
    render(<MenuListScreen />);

    expect(screen.getByRole('heading', { name: 'Menu Management' })).toBeDefined();
    expect(screen.getByText('Manage items and categories')).toBeDefined();

    await waitFor(() => expect(screen.getByText('Spring Rolls')).toBeDefined());
    const addLinks = screen.getAllByRole('link', { name: '+ Add Item' });
    expect(addLinks[0]?.getAttribute('href')).toBe('/menu/new');
  });

  // Loading state (B7 — not drawn on the wireframe, still required).
  it('shows a loading state while the categories/items fetch is in flight, then replaces it once ready', async () => {
    let resolveCategories!: (value: unknown) => void;
    getMock.mockImplementation((path: string) => {
      if (path === cafe.CAFE_ROUTES.categories) {
        return new Promise((resolve) => {
          resolveCategories = resolve;
        });
      }
      return Promise.resolve(itemsResponse([]));
    });

    render(<MenuListScreen />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText(/loading menu items/i)).toBeDefined();

    resolveCategories(categoriesResponse([]));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  // Error state (B7).
  it('shows an error banner when the fetch fails, and no loading spinner remains', async () => {
    getMock.mockRejectedValue(new Error('network error'));
    render(<MenuListScreen />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText('Something went wrong loading the menu. Try again.')).toBeDefined();
    expect(screen.queryByRole('status')).toBeNull();
  });

  // Error state, `success: false` branch — apiResponseSchema's real
  // discriminated-union shape (`{ success: false, data: null, error }`)
  // rather than a thrown/rejected fetch. Every other error-path test in
  // this file uses mockRejectedValue; this proves the component's own
  // `!categoriesResponse.success` guard (menu-list-screen.tsx's load())
  // reaches the same clean error state instead of crashing on `.data`
  // being `null`.
  it('shows the same error state when a fetch resolves with success: false instead of rejecting', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === cafe.CAFE_ROUTES.categories) {
        return Promise.resolve({ success: false, data: null, error: { message: 'Unauthorized' } });
      }
      return Promise.resolve(itemsResponse([]));
    });
    render(<MenuListScreen />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText('Something went wrong loading the menu. Try again.')).toBeDefined();
    expect(screen.queryByRole('status')).toBeNull();
  });

  // Empty state (B7 + index.md's own "Empty state" copy).
  it('shows the "No menu items yet" empty state (with its own Add Item button) when there are no items', async () => {
    mockSuccess([STARTERS, MAINS], []);
    render(<MenuListScreen />);

    const emptyMessage = await screen.findByText('No menu items yet');
    // Scoped to the empty state's own container (not just "at least one Add
    // Item link anywhere on the page", which the header's own AddItemLink
    // would always satisfy on its own even if the empty state's dedicated
    // button were deleted) — proves the empty state's own Add Item button
    // specifically exists.
    const emptyStateContainer = emptyMessage.closest('div')!;
    expect(within(emptyStateContainer).getByRole('link', { name: '+ Add Item' })).toBeDefined();
    // And the header's own AddItemLink is still there too — both exist.
    expect(screen.getAllByRole('link', { name: '+ Add Item' })).toHaveLength(2);
    // Category headers aren't rendered when nothing is grouped under them.
    expect(screen.queryByText('STARTERS')).toBeNull();
  });

  it('also shows the empty state when there are no categories at all', async () => {
    mockSuccess([], []);
    render(<MenuListScreen />);

    await waitFor(() => expect(screen.getByText('No menu items yet')).toBeDefined());
  });

  // AC5/AC6 — grouping by categoryId and category display order.
  it('groups items under their own category, in the category order the categories response returned', async () => {
    mockSuccess(
      [STARTERS, MAINS, BEVERAGES],
      [springRolls, garlicBread, grilledChicken, vegBurger, icedTea],
    );
    render(<MenuListScreen />);

    await waitFor(() => expect(screen.getByText('Iced Tea')).toBeDefined());

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['STARTERS', 'MAINS', 'BEVERAGES']);

    const startersSection = screen.getByText('STARTERS').closest('section')!;
    expect(within(startersSection).getByText('Spring Rolls')).toBeDefined();
    expect(within(startersSection).getByText('Garlic Bread')).toBeDefined();
    expect(within(startersSection).queryByText('Grilled Chicken')).toBeNull();
    // No client-side re-sort (this component's own documented behavior,
    // see its file-header comment): STARTERS' items must read in the exact
    // order the fixture's items response returned them — Spring Rolls
    // before Garlic Bread — not just "both present". This would fail if
    // that ordering were silently reversed, which mere presence checks
    // above would not catch.
    const startersItemNames = within(startersSection)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(startersItemNames[0]).toMatch(/^Spring Rolls/);
    expect(startersItemNames[1]).toMatch(/^Garlic Bread/);

    const mainsSection = screen.getByText('MAINS').closest('section')!;
    expect(within(mainsSection).getByText('Grilled Chicken')).toBeDefined();
    expect(within(mainsSection).getByText('Veg Burger')).toBeDefined();

    const beveragesSection = screen.getByText('BEVERAGES').closest('section')!;
    expect(within(beveragesSection).getByText('Iced Tea')).toBeDefined();
  });

  it('renders each item\'s price formatted as $X.00', async () => {
    mockSuccess([STARTERS], [springRolls]);
    render(<MenuListScreen />);

    await waitFor(() => expect(screen.getByText('$5.00')).toBeDefined());
  });

  // AC3 — availability badge state, both directions (accept/reject symmetry
  // per B2: an available item must read "Available", an unavailable item
  // must read "Unavailable" — proving only one direction would leave the
  // other unproven).
  describe('AC3 — availability badge', () => {
    it('renders "Available" (green) for an available item', async () => {
      mockSuccess([STARTERS], [springRolls]);
      render(<MenuListScreen />);

      const badge = await screen.findByText('Available');
      expect(badge.className).toContain('green');
      expect(screen.queryByText('Unavailable')).toBeNull();
    });

    it('renders "Unavailable" (muted) for an unavailable item, and it stays visible in this admin list (not hidden)', async () => {
      mockSuccess([MAINS], [vegBurger]);
      render(<MenuListScreen />);

      const badge = await screen.findByText('Unavailable');
      expect(badge.className).not.toContain('green');
      expect(screen.getByText('Veg Burger')).toBeDefined();
    });

    it('renders both badge states correctly in the same list (AC3\'s own admin-list requirement)', async () => {
      mockSuccess([MAINS], [grilledChicken, vegBurger]);
      render(<MenuListScreen />);

      await waitFor(() => expect(screen.getByText('Veg Burger')).toBeDefined());
      expect(screen.getByText('Available')).toBeDefined();
      expect(screen.getByText('Unavailable')).toBeDefined();
    });
  });

  it('each item row has an Edit link', async () => {
    mockSuccess([STARTERS], [springRolls]);
    render(<MenuListScreen />);

    const editLink = await screen.findByRole('link', { name: 'Edit' });
    expect(editLink.getAttribute('href')).toBe('/menu/item-1/edit');
  });
});
