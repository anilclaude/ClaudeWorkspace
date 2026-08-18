import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { cafe } from '@app/contracts';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';
import { storeSessionToken, readSessionToken, clearSessionToken } from '@/lib/session-storage';
import { DashboardScreen } from './dashboard-screen';

// cr-dashboard-menu-management-link, T01 (AC1-AC6) — mirrors
// menu-list-screen.test.tsx's shape: `cafeService()` is mocked (its `get`
// method) — this suite is about what DashboardScreen does with the
// categories/items responses (KPI/table counts, loading/error/empty), not
// about the contract-validated HTTP client itself.
const getMock = vi.fn();
vi.mock('@/lib/services', () => ({
  cafeService: () => ({ get: getMock }),
}));

// cr-logout-and-back-navigation, T01 — TopHeader now calls useRouter() for
// its new back arrow/logout control, following login/page.test.tsx's own
// mocking pattern.
const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
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

const COFFEE: cafe.MenuCategory = { id: 'cat-coffee', name: 'Coffee', sortOrder: 0 };
const BREAKFAST: cafe.MenuCategory = { id: 'cat-breakfast', name: 'Breakfast', sortOrder: 1 };
const DESSERTS: cafe.MenuCategory = { id: 'cat-desserts', name: 'Desserts', sortOrder: 2 };

function mockSuccess(categories: cafe.MenuCategory[], items: cafe.MenuItem[]) {
  getMock.mockImplementation((path: string) => {
    if (path === cafe.CAFE_ROUTES.categories) return Promise.resolve(categoriesResponse(categories));
    if (path === cafe.CAFE_ROUTES.items) return Promise.resolve(itemsResponse(items));
    throw new Error(`unexpected path: ${path}`);
  });
}

// cr-session-guard-redirect-to-login, T01 — this screen's own mount-fetch
// effect is now gated behind `useRequireSession`, so every test below that
// exercises the fetch (all of them except the new AC1 "no session" test)
// needs a real, unexpired JWT-shaped token seeded into the store before
// render — otherwise `useRequireSession` would redirect to /login and the
// fetch would never fire. Same hand-rolled token shape login/page.test.tsx's
// own T11 suite uses (this file also runs under jsdom, so `btoa` is
// available).
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

// Value elements are rendered as the text-content sibling immediately after
// each KPI's label text (see dashboard-screen.tsx's KpiCard) — this reads
// the same DOM structure a real user sees, without adding a test-only
// data-testid attribute. Scoped to the "Key metrics" region specifically —
// "Active Items" is also the Menu Overview table's column header text, so
// an unscoped screen.getByText(label) would ambiguously match both.
function kpiValue(label: string): string | null | undefined {
  const region = screen.getByRole('region', { name: 'Key metrics' });
  return within(region).getByText(label).nextElementSibling?.textContent;
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    getMock.mockReset();
    pushMock.mockReset();
    backMock.mockReset();
    setCurrentStore(makeStore());
    // cr-session-guard-redirect-to-login, T01 (AC2) — a valid session by
    // default so every existing test below keeps exercising the real fetch
    // path unchanged; the new AC1 "no session" test below explicitly clears
    // this before rendering instead.
    getStore()!.dispatch(setSessionToken(validToken()));
  });

  // AC1 — replaces the placeholder with the wireframe's widgets.
  it('renders the dashboard title, welcome section, and Menu Overview/Recent Menu Changes cards', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    render(<DashboardScreen />);

    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeDefined();
    // cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1) — the
    // default seeded session (validToken() below) is ada@example.com, so the
    // greeting is derived, not the old hardcoded "John".
    expect(screen.getByText('Good morning, Ada! 👋')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Menu Overview' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Recent Menu Changes' })).toBeDefined();
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());
  });

  // cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1/VC-CR-001)
  // — the header's avatar initials and name are derived from the real
  // session email (default seeded token: ada@example.com), not the
  // hardcoded "JS"/"John Smith".
  it('AC1/VC-CR-001 — the header avatar initials and name are derived from the real session email', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    expect(screen.getByText('AD')).toBeDefined();
    expect(screen.getByText('Ada', { selector: 'span' })).toBeDefined();
    expect(screen.queryByText('JS')).toBeNull();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  // cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1) — proves
  // genuine dependence on the session's email (not a hardcoded stand-in that
  // happens to differ from "John"/"JS" by coincidence): a different email
  // produces different derived name/initials in both the welcome message and
  // the header.
  it('AC1 — a different session email produces different derived name and initials than the default', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    storeSessionToken(makeToken({ sub: 'user-2', email: 'jordan.lee@example.com', exp }));
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    expect(screen.getByText('Good morning, Jordan.lee! 👋')).toBeDefined();
    expect(screen.getByText('JO')).toBeDefined();
    expect(screen.queryByText('Good morning, Ada! 👋')).toBeNull();
    expect(screen.queryByText('AD')).toBeNull();
  });

  // cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC2) — the date
  // button shows the real current date, not the hardcoded/stale "12 Aug
  // 2025". Computes the expected string the same way the component does
  // (day, no leading zero; short month name; full year) instead of freezing
  // a specific past date, since this is now dynamic by design.
  it('AC2 — the welcome section shows the real current date, formatted day/short-month/year', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const expectedDate = `${now.getDate()} ${shortMonthNames[now.getMonth()]} ${now.getFullYear()}`;

    expect(screen.getByText(expectedDate)).toBeDefined();
    expect(screen.queryByText('12 Aug 2025')).toBeNull();
  });

  // AC2/VC-CR-001 — Total = items.length, Active = items.filter(isAvailable).length,
  // Categories = categories.length. Also proves AC3's per-category table math
  // (Items/Active Items/Status) using the same fetched data, including both
  // the "Active" and "Inactive" badge directions (B2 accept/reject symmetry).
  it('VC-CR-001 — KPI cards and the Menu Overview table compute correct counts from fetched data', async () => {
    mockSuccess(
      [COFFEE, BREAKFAST, DESSERTS],
      [
        item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4, isAvailable: true }),
        item({ id: 'i-2', categoryId: 'cat-coffee', name: 'Espresso', price: 3, isAvailable: true }),
        item({ id: 'i-3', categoryId: 'cat-coffee', name: 'Mocha', price: 5, isAvailable: false }),
        item({ id: 'i-4', categoryId: 'cat-breakfast', name: 'Toast', price: 6, isAvailable: true }),
        item({ id: 'i-5', categoryId: 'cat-breakfast', name: 'Omelette', price: 8, isAvailable: true }),
        item({ id: 'i-6', categoryId: 'cat-desserts', name: 'Cake', price: 7, isAvailable: false }),
      ],
    );
    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    // KPI cards: Total = 6, Active = 4, Categories = 3.
    expect(kpiValue('Total Menu Items')).toBe('6');
    expect(kpiValue('Active Items')).toBe('4');
    expect(kpiValue('Categories')).toBe('3');

    // Coffee: 3 items, 2 active -> "Active" (green) badge.
    const coffeeRow = screen.getByText('Coffee').closest('tr')!;
    expect(within(coffeeRow).getByText('3')).toBeDefined();
    expect(within(coffeeRow).getByText('2')).toBeDefined();
    const coffeeBadge = within(coffeeRow).getByText('Active');
    expect(coffeeBadge.className).toContain('green');

    // Breakfast: 2 items, 2 active -> "Active". Both the Items and Active
    // Items cells read "2" here, so this checks each <td>'s own text
    // directly rather than a scoped getByText (which would ambiguously
    // match both cells).
    const breakfastRow = screen.getByText('Breakfast').closest('tr')!;
    const breakfastCells = within(breakfastRow)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);
    expect(breakfastCells[1]).toBe('2'); // Items
    expect(breakfastCells[2]).toBe('2'); // Active Items
    expect(within(breakfastRow).getByText('Active')).toBeDefined();

    // Desserts: 1 item, 0 active -> "Inactive" (not green) badge — proves
    // the other direction of the Active/Inactive derivation.
    const dessertsRow = screen.getByText('Desserts').closest('tr')!;
    const dessertsBadge = within(dessertsRow).getByText('Inactive');
    expect(dessertsBadge.className).not.toContain('green');
  });

  // cr-menu-list-navigation-link, T01 (AC1) — Menu Management now resolves
  // to /menu (the list screen), not /menu/new.
  it('AC1 — the Menu Management nav link resolves to /menu', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    const menuManagementLink = screen.getByRole('link', { name: 'Menu Management' });
    expect(menuManagementLink.getAttribute('href')).toBe('/menu');
  });

  // cr-menu-list-navigation-link, T01 (AC3) — the "+ Add Menu Item" header
  // button is a different dashboard widget from "Menu Management" and is
  // untouched by this CR, still resolving to /menu/new.
  it('AC3 — the Add Menu Item button is unchanged, still resolving to /menu/new', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    const addMenuItemLink = screen.getByRole('link', { name: '+ Add Menu Item' });
    expect(addMenuItemLink.getAttribute('href')).toBe('/menu/new');

    // Still exactly two real <a> links on the whole screen (the nav item
    // and the header button) — no other dashboard widget/link is altered.
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  // AC4/VC-CR-002 — every other left-nav item is provably inert: no
  // navigation, no console error, on a real click.
  //
  // cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC3/VC-CR-002)
  // — these items are no longer `disabled` (enabled, focusable, hover-
  // affordant like a real nav link); the "no navigation, no console error"
  // assertions below are kept exactly as strict as before this CR.
  it('VC-CR-002 — every left-nav item other than Menu Management is inert (enabled, no navigation, no console error)', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    const inertLabels = [
      'Dashboard',
      'Orders',
      'Kitchen Operations',
      'Inventory',
      'Purchase & Suppliers',
      'Staff Management',
      'Attendance & Roster',
      'Customers',
      'Loyalty Program',
      'Reports',
      'Analytics',
      'Notifications',
      'AI Assistant',
      'Settings',
    ];

    // Scoped to the primary left nav specifically — the top header also has
    // its own "Notifications" control (a decorative bell button, not a nav
    // item), which would otherwise collide with the nav item of the same
    // name under an unscoped query.
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    for (const label of inertLabels) {
      // Not a real link at all.
      expect(within(nav).queryByRole('link', { name: label })).toBeNull();
      const control = within(nav).getByRole('button', { name: new RegExp(`^${label}`) });
      expect(control).toHaveProperty('disabled', false);
      const before = window.location.href;
      fireEvent.click(control);
      expect(window.location.href).toBe(before);
    }

    // reviewer SHOULD-FIX (cr-dashboard-live-identity-date-and-nav-affordance,
    // T01, review cycle 1) — window.location.href staying put doesn't prove
    // router.push() was never called (jsdom doesn't actually navigate), so
    // this also asserts pushMock directly, same as the back-arrow test above.
    expect(pushMock).not.toHaveBeenCalled();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // Loading state (B7 — not drawn on the wireframe, still required).
  it('shows a loading state while the fetch is in flight, and KPI values read "—" until it resolves', async () => {
    let resolveCategories!: (value: unknown) => void;
    getMock.mockImplementation((path: string) => {
      if (path === cafe.CAFE_ROUTES.categories) {
        return new Promise((resolve) => {
          resolveCategories = resolve;
        });
      }
      return Promise.resolve(itemsResponse([]));
    });

    render(<DashboardScreen />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(kpiValue('Total Menu Items')).toBe('—');
    expect(kpiValue('Active Items')).toBe('—');
    expect(kpiValue('Categories')).toBe('—');

    resolveCategories(categoriesResponse([]));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  // Error state (B7).
  it('shows an error banner when the fetch fails, and no loading spinner remains', async () => {
    getMock.mockRejectedValue(new Error('network error'));
    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText('Something went wrong loading the dashboard. Try again.')).toBeDefined();
    expect(screen.queryByRole('status')).toBeNull();
    expect(kpiValue('Total Menu Items')).toBe('—');
  });

  // cr-session-guard-redirect-to-login, T01 (AC1) — mounting with no valid
  // session redirects straight to /login instead of ever firing this
  // screen's own categories/items fetch, and the existing generic
  // LOAD_ERROR_MESSAGE banner never appears.
  it('AC1 — with no session, redirects to /login instead of fetching or showing the generic error banner', () => {
    clearSessionToken();
    expect(readSessionToken()).toBeNull();

    render(<DashboardScreen />);

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Something went wrong loading the dashboard. Try again.')).toBeNull();
  });

  // Error state, `success: false` branch — same treatment as
  // menu-list-screen.test.tsx's equivalent case.
  it('shows the same error state when a fetch resolves with success: false instead of rejecting', async () => {
    getMock.mockImplementation((path: string) => {
      if (path === cafe.CAFE_ROUTES.categories) {
        return Promise.resolve({ success: false, data: null, error: { message: 'Unauthorized' } });
      }
      return Promise.resolve(itemsResponse([]));
    });
    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText('Something went wrong loading the dashboard. Try again.')).toBeDefined();
  });

  // Empty state — Menu Overview, when the fetch succeeds with zero
  // categories (B7).
  it('shows the "No menu categories yet" empty state when there are no categories, with KPI values at 0', async () => {
    mockSuccess([], []);
    render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText('No menu categories yet')).toBeDefined());
    expect(kpiValue('Total Menu Items')).toBe('0');
    expect(kpiValue('Active Items')).toBe('0');
    expect(kpiValue('Categories')).toBe('0');
  });

  // cr-dashboard-recent-menu-changes, T01 (AC3) — supersedes
  // cr-dashboard-menu-management-link's old AC6 (permanent, always-empty
  // state, regardless of items): with zero menu items, the card still shows
  // "No recent activity", but now as a genuine empty state — the fetch
  // succeeded with items=[COFFEE] category but zero items, not an unrelated
  // permanent placeholder. The old version of this test seeded one item and
  // still asserted "No recent activity", which is no longer true post-CR;
  // replaced rather than deleted (B3).
  it('AC3 — Recent Menu Changes shows "No recent activity" when there are zero menu items', async () => {
    mockSuccess([COFFEE], []);
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    const recentChangesHeading = screen.getByRole('heading', { name: 'Recent Menu Changes' });
    const recentChangesCard = recentChangesHeading.closest('div')!.parentElement!;
    expect(within(recentChangesCard).getByText('No recent activity')).toBeDefined();
  });

  // AC1/VC-CR-001 — up to 5 entries, sorted by updatedAt descending, capped
  // even with more than 5 items available. Six items seeded with distinct
  // updatedAt values; the 6th-most-recent ("Latte") must not appear.
  it('AC1/VC-CR-001 — Recent Menu Changes lists up to 5 items sorted by updatedAt descending', async () => {
    mockSuccess(
      [COFFEE],
      [
        item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4, updatedAt: '2026-01-01T00:00:00.000Z' }),
        item({ id: 'i-2', categoryId: 'cat-coffee', name: 'Espresso', price: 3, updatedAt: '2026-01-05T00:00:00.000Z' }),
        item({ id: 'i-3', categoryId: 'cat-coffee', name: 'Mocha', price: 5, updatedAt: '2026-01-03T00:00:00.000Z' }),
        item({ id: 'i-4', categoryId: 'cat-coffee', name: 'Cappuccino', price: 4, updatedAt: '2026-01-06T00:00:00.000Z' }),
        item({ id: 'i-5', categoryId: 'cat-coffee', name: 'Flat White', price: 4, updatedAt: '2026-01-02T00:00:00.000Z' }),
        item({ id: 'i-6', categoryId: 'cat-coffee', name: 'Macchiato', price: 4, updatedAt: '2026-01-04T00:00:00.000Z' }),
      ],
    );
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    const recentChangesHeading = screen.getByRole('heading', { name: 'Recent Menu Changes' });
    const recentChangesCard = recentChangesHeading.closest('div')!.parentElement!;
    const rows = within(recentChangesCard).getAllByRole('listitem');
    const names = rows.map((row) => row.querySelector('p')?.textContent);

    // updatedAt descending: Cappuccino (06) > Espresso (05) > Macchiato (04)
    // > Mocha (03) > Flat White (02) > Latte (01, excluded by the 5-cap).
    expect(names).toEqual(['Cappuccino', 'Espresso', 'Macchiato', 'Mocha', 'Flat White']);
    expect(rows).toHaveLength(5);
    expect(within(recentChangesCard).queryByText('Latte')).toBeNull();
  });

  // AC2/VC-CR-002 — an item whose createdAt equals updatedAt renders
  // "Added"; an item whose updatedAt is later than createdAt renders
  // "Updated". Both directions are asserted on their own row (not just "one
  // of the two labels shows up somewhere"), so this would fail if the
  // added/updated logic were swapped or always rendered one label.
  it('AC2/VC-CR-002 — entries show "Added" when createdAt equals updatedAt, "Updated" otherwise', async () => {
    mockSuccess(
      [COFFEE],
      [
        item({
          id: 'i-1',
          categoryId: 'cat-coffee',
          name: 'Latte',
          price: 4,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        item({
          id: 'i-2',
          categoryId: 'cat-coffee',
          name: 'Espresso',
          price: 3,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
        }),
      ],
    );
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    const recentChangesHeading = screen.getByRole('heading', { name: 'Recent Menu Changes' });
    const recentChangesCard = recentChangesHeading.closest('div')!.parentElement!;

    const latteRow = within(recentChangesCard).getByText('Latte').closest('li')!;
    expect(within(latteRow).getByText('Added')).toBeDefined();
    expect(within(latteRow).queryByText('Updated')).toBeNull();

    const espressoRow = within(recentChangesCard).getByText('Espresso').closest('li')!;
    expect(within(espressoRow).getByText('Updated')).toBeDefined();
    expect(within(espressoRow).queryByText('Added')).toBeNull();
  });

  // cr-logout-and-back-navigation, T01 (AC1/VC-CR-001) — clicking the
  // repurposed "Log out" control (formerly the inert "User menu" button)
  // clears the in-memory session and navigates to /login.
  it('AC1/VC-CR-001 — clicking the logout control clears the session and navigates to /login', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    // cr-session-guard-redirect-to-login, T01 — a real JWT-shaped token, not
    // the old 'a.b.c' placeholder: this screen's mount-fetch effect is now
    // gated behind useRequireSession's real checkSession/readSessionToken
    // check, which rejects 'a.b.c' as unparseable (not a valid session),
    // so the fetch would never fire and "Coffee" below would never render.
    storeSessionToken(validToken());
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(readSessionToken()).toBeNull();
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  // cr-logout-and-back-navigation, T01 (AC2/VC-CR-002) — the back arrow
  // calls the router's own back navigation, not a push/replace to a fixed
  // destination.
  it('AC2/VC-CR-002 — the back arrow calls router.back(), not push/replace to a fixed path', async () => {
    mockSuccess([COFFEE], [item({ id: 'i-1', categoryId: 'cat-coffee', name: 'Latte', price: 4 })]);
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Coffee')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(backMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  // cr-logout-and-back-navigation, T01 (AC3) — review cycle 1 rework (BLOCKER):
  // the original version of this test hardcoded `getMock` to `success: false`
  // regardless of session state, so the `storeSessionToken`/`clearSessionToken`
  // calls at the top were structurally disconnected from the mocked outcome —
  // deleting them left the test passing identically, which meant it never
  // actually exercised "logout causes the next fetch to be unauthenticated".
  // Fixed per reviewer option (a) (logged in scaffold/memory/DECISIONS.md,
  // "cr-logout-and-back-navigation T01 (review cycle 1 rework)").
  //
  // cr-session-guard-redirect-to-login, T01 — this test's own premise (a
  // cleared session still lets the fetch run and fail into the generic
  // error banner) is exactly the bug this CR fixes on purpose: mounting
  // with no valid session now redirects to /login before the fetch ever
  // fires, instead of letting it run and 401 into
  // LOAD_ERROR_MESSAGE. Updated to assert the new, correct behavior — same
  // "a real logout cleared the session" setup, new expectation (redirect,
  // no fetch call, no banner) in place of the old one.
  it('AC3 — after a real logout clears the session, mounting the screen again redirects to /login instead of showing the old error banner', async () => {
    storeSessionToken(validToken());
    clearSessionToken();
    expect(readSessionToken()).toBeNull();

    render(<DashboardScreen />);

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Something went wrong loading the dashboard. Try again.')).toBeNull();
  });
});
