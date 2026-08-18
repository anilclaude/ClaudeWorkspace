'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ClipboardList,
  Coffee,
  Eye,
  Gift,
  Home,
  Loader2,
  Menu as MenuIcon,
  Package,
  PieChart,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, IconButton, buttonVariants, cn } from '@app/ui';
import { cafe } from '@app/contracts';
import { ApiClientError } from '@app/frontend-core';
import { cafeService } from '@/lib/services';
import { clearSessionToken } from '@/lib/session-storage';
import { useRequireSession } from '@/lib/use-require-session';
import { useSessionUser, displayNameFromEmail, avatarInitialsFromEmail } from '@/lib/use-session-user';

// cr-dashboard-menu-management-link, T01 (AC1-AC6) — replaces the login
// PRD's one-line /dashboard placeholder (T07) with the screen drawn in
// docs/wireframes/dashboard/CafeDashboard.png. Only "Menu Management" (AC4)
// and "+ Add Menu Item" (AC5) are real, working links. Every other nav
// item/widget renders exactly as drawn but is inert. Full scope reasoning:
// scaffold/memory/DECISIONS.md, "cr-dashboard-menu-management-link
// (planning)".
//
// cr-menu-list-navigation-link, T01 (AC1-AC3) — "Menu Management" (AC4
// above) now routes to /menu (the menu list/overview screen), not
// /menu/new. The list screen's own "+ Add Item" control (menu-list-
// screen.tsx) is the create path from there; "+ Add Menu Item" here (AC5
// above) is untouched and still goes straight to /menu/new.
//
// Real data (AC2/AC3): same GET /menu/categories + GET /menu/items calls
// frontend/web/src/modules/menu/components/menu-list-screen.tsx (T10,
// cafe-menu-management) already makes — same fetch pattern (cafeService(),
// Promise.all, the success:false guard, the cancelled-on-unmount guard,
// loading/error states), reused here rather than reinvented.
//
// AC4's opening sentence ("Menu Management left-nav item is the only real
// navigation link in the entire left nav") is read literally to include
// "Dashboard" itself — Dashboard renders as a highlighted/active but
// non-navigating item, not a self-link. VC-CR-002's test only needs to prove
// inertness for "any left-nav item other than Dashboard or Menu
// Management" (it doesn't need to click Dashboard at all, since a real
// click there would be a same-page no-op either way) — that carve-out is
// about what the test exercises, not a grant of real-link status to
// Dashboard. Logged in scaffold/memory/DECISIONS.md.
//
// Loading/error states (B7 — not drawn on the wireframe, still required):
// mirrors MenuListScreen's own precedent — a role="status" spinner while
// loading, a role="alert" banner on fetch failure (network error, non-2xx,
// or success:false) — scoped to the KPI cards + Menu Overview table, since
// those are the only widgets driven by this fetch. The rest of the screen
// (nav, header, welcome section, Recent Menu Changes) renders immediately,
// independent of fetch status.
//
// Empty states (B7): Menu Overview shows "No menu categories yet" when the
// fetch succeeds with zero categories. "Recent Menu Changes" (AC6) used to
// always show "No recent activity" as a permanent empty state — superseded
// by cr-dashboard-recent-menu-changes, T01 below.
//
// Layout note: the wireframe draws an edge-to-edge sidebar spanning the
// full viewport height/width. This screen instead renders inside a
// max-w-6xl, centered, px-4 py-8 <main> container — a width-constrained
// approximation of the wireframe's layout and hierarchy, not a
// pixel-exact full-bleed reproduction. Reversible layering/sizing default
// per B8, logged in scaffold/memory/DECISIONS.md.
//
// cr-remove-appshell-chrome-from-dashboard, T01: /dashboard now renders
// under its own (dashboard) route group (see
// src/app/(dashboard)/layout.tsx), which never imports AppShell — so
// AppShell's shared top bar (brand + "Menu" nav link) no longer renders
// above this screen's own header. The double-header stacking this comment
// used to describe is closed; this screen's TopHeader is the only top
// chrome shown on /dashboard.
//
// cr-logout-and-back-navigation, T01 (AC1/AC2) — TopHeader gains a back
// arrow (new — this screen had no "back" concept before) and a working
// logout control. The logout control reuses the existing "User menu"
// IconButton (avatar + name) rather than adding a second, redundant
// control next to it: wiring a real onClick onto the control this screen
// already draws is simpler than a dropdown-with-a-logout-item, which
// would be scope creep (B1) for what this CR actually asks for. Its
// accessible name changes from "User menu" to "Log out" so the control's
// actual behavior — logging out, not opening a menu — is what a screen
// reader announces. Logged in scaffold/memory/DECISIONS.md.
//
// cr-session-guard-redirect-to-login, T01 (AC1-AC3): the categories/items
// fetch below no longer fires unconditionally on mount. `useRequireSession`
// (@/lib/use-require-session) runs first; with no valid session it redirects
// straight to /login instead of letting this fetch 401 into the generic
// LOAD_ERROR_MESSAGE banner. The fetch effect is gated on `hasSession` so it
// only ever fires once a session is confirmed valid — while that check is
// still running (or redirecting), `status` stays at its default 'loading',
// so this renders the same loading state as before, not a new one.
//
// cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1-AC3):
// - AC1/VC-CR-001 — WelcomeSection's greeting and TopHeader's avatar/name
//   now reflect the real signed-in user instead of hardcoded "John"/"John
//   Smith"/"JS". `useSessionUser` (@/lib/use-session-user, read-only,
//   doesn't redirect — that's still `useRequireSession`'s job alone) supplies
//   the email; `displayNameFromEmail`/`avatarInitialsFromEmail` derive
//   cosmetic display values from it, since no "name" field exists anywhere
//   in this system (see the CR's "Why" section). Before the session check
//   resolves, both derive to `''`, so WelcomeSection/TopHeader render their
//   graceful "no name yet" fallback for that brief window rather than a
//   flash of stale placeholder text. TopHeader's "Admin" role line is
//   untouched — explicitly out of scope per the CR.
// - AC2 — WelcomeSection's date is now `formatWelcomeDate(new Date())`,
//   computed client-side at render, replacing the hardcoded/stale "12 Aug
//   2025". No timezone AC is pinned; client-local date is fine.
// - AC3/VC-CR-002 — InertNavItem is no longer `disabled`: it's a real,
//   focusable, hover-affordant control (same `hover:bg-slate-100` NavLink
//   uses, applied only to the non-active case so it doesn't visually
//   conflict with the active "Dashboard" item's solid indigo styling) whose
//   onClick is an explicit no-op. See InertNavItem's own comment below.
//
// cr-dashboard-recent-menu-changes, T01 (AC1-AC4) — supersedes
// cr-dashboard-menu-management-link's AC6 ("Recent Menu Changes" as a
// permanent, always-empty state): every `MenuItem` already carries
// `createdAt`/`updatedAt`, and this screen already fetches the full item
// list for its KPI cards (`items` state below), so no new fetch/endpoint is
// needed (see the CR's own "Build gate: no").
// - AC1/VC-CR-001 — `recentChanges` (new useMemo, alongside `categoryRows`)
//   sorts a *copy* of `items` (`[...items].sort(...)`, never `items` itself
//   — that array is still read by the KPI cards/categoryRows above) by
//   `updatedAt` descending and caps at 5.
// - AC2/VC-CR-002 — each entry's "added" vs "updated" label is derived
//   purely from `item.createdAt === item.updatedAt` (equal → never edited
//   since creation → "added"; otherwise "updated"). Timestamp formatting
//   reuses `formatWelcomeDate` (day/short-month/year) plus a small
//   hours:minutes suffix, rather than a second hand-rolled date format or a
//   new dependency (B6).
// - AC3 — with zero items, `recentChanges` is `[]`, so the card falls back
//   to `NO_RECENT_ACTIVITY_MESSAGE` — now a genuine empty state (fetch
//   succeeded, there's just nothing to show), not the old unconditional
//   permanent one.
// - AC4 — deliberately only name + added/updated + timestamp: no per-field
//   diff, no deletion tracking, no "changed by" attribution — this is not a
//   full audit log, per the CR's own AC4.
// Loading/error: the card gates on `isReady` and renders nothing while
// loading or on fetch error, consistent with this file's other
// fetch-dependent widgets deferring to the KPI cards/Menu Overview table's
// own loading spinner/error banner above it rather than a third, separate
// state machine for one card (reversible default per B8, logged in
// scaffold/memory/DECISIONS.md).

const LOAD_ERROR_MESSAGE = 'Something went wrong loading the dashboard. Try again.';
const NO_CATEGORIES_MESSAGE = 'No menu categories yet';
const NO_RECENT_ACTIVITY_MESSAGE = 'No recent activity';

type LoadStatus = 'loading' | 'error' | 'ready';

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

interface NavEntry {
  label: string;
  icon: IconType;
  href?: string;
  badge?: string;
}

interface NavSection {
  heading?: string;
  items: NavEntry[];
}

const NAV_SECTIONS: NavSection[] = [
  { items: [{ label: 'Dashboard', icon: Home }] },
  {
    heading: 'OPERATIONS',
    items: [
      { label: 'Menu Management', icon: BookOpen, href: '/menu' },
      { label: 'Orders', icon: ShoppingCart },
      { label: 'Kitchen Operations', icon: ChefHat },
      { label: 'Inventory', icon: Package },
      { label: 'Purchase & Suppliers', icon: Truck },
    ],
  },
  {
    heading: 'PEOPLE',
    items: [
      { label: 'Staff Management', icon: Users },
      { label: 'Attendance & Roster', icon: CalendarCheck },
      { label: 'Customers', icon: User },
      { label: 'Loyalty Program', icon: Gift },
    ],
  },
  {
    heading: 'REPORTS & ANALYTICS',
    items: [
      { label: 'Reports', icon: BarChart3 },
      { label: 'Analytics', icon: PieChart },
    ],
  },
  {
    heading: 'SYSTEM',
    items: [
      { label: 'Notifications', icon: Bell },
      { label: 'AI Assistant', icon: Sparkles, badge: 'New' },
      { label: 'Settings', icon: Settings },
    ],
  },
];

const NAV_ITEM_CLASSES =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors';

// AC4/AC5 — plain navigation, not a submission/action, so a real <a>
// (styled via buttonVariants/NAV_ITEM_CLASSES, not a <button> nested inside
// one) is the correct element, matching menu-list-screen.tsx's own
// AddItemLink precedent (logged in scaffold/memory/DECISIONS.md,
// "cafe-menu-management T10").
function NavLink({ item }: { item: NavEntry }) {
  const Icon = item.icon;
  return (
    <Link href={item.href!} className={cn(NAV_ITEM_CLASSES, 'text-slate-700 hover:bg-slate-100')}>
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

// Every left-nav item other than "Menu Management" (AC4) — a real, enabled
// <button> (cr-dashboard-live-identity-date-and-nav-affordance, T01, AC3):
// no `disabled` attribute, so it's focusable and hover-affordant like a real
// nav link (NavLink's own `hover:bg-slate-100`, only for the non-active
// case — the active "Dashboard" item keeps its own solid indigo styling
// instead). There is still nowhere for it to navigate to, so its `onClick`
// is an explicit no-op rather than an omitted handler: VC-CR-002 (no
// navigation, no console error) holds because the handler provably does
// nothing, not because no handler exists.
function InertNavItem({ item, active }: { item: NavEntry; active?: boolean }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={(event) => event.preventDefault()}
      aria-current={active ? 'page' : undefined}
      className={cn(
        NAV_ITEM_CLASSES,
        active ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <Badge kind="info" className="bg-indigo-100 text-indigo-700">
          {item.badge}
        </Badge>
      ) : null}
    </button>
  );
}

function Sidebar() {
  return (
    <aside className="flex w-64 flex-shrink-0 flex-col gap-6 border-r border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Coffee className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold leading-tight text-slate-900">
          Smart Café
          <br />
          Operations
        </span>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-4">
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.heading ?? `section-${index}`}>
            {section.heading ? (
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.heading}</p>
            ) : null}
            <div className="flex flex-col gap-1">
              {section.items.map((item) =>
                item.href ? (
                  <NavLink key={item.label} item={item} />
                ) : (
                  <InertNavItem key={item.label} item={item} active={item.label === 'Dashboard'} />
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Store selector — decorative, no store-switching mechanism exists
          anywhere in this codebase. */}
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-left disabled:cursor-default"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          <Coffee className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-slate-900">Café Central</span>
          <span className="block text-xs text-slate-500">Melbourne, Australia</span>
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
      </button>
    </aside>
  );
}

// Top header — search bar, notifications bell, user avatar/name. Static per
// this task's scope (no real search/notification functionality expected,
// not bound to any AC) — every control here is a real, disabled <button>
// (or a disabled <input>) so nothing throws or silently "does something"
// when clicked.
//
// cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1) —
// `displayName`/`initials` are derived from the real signed-in user's email
// (@/lib/use-session-user), not hardcoded "John Smith"/"JS". Both are `''`
// for the brief window before the session check resolves, which renders as
// an empty name/initials rather than stale placeholder text. The "Admin"
// role line stays hardcoded — explicitly out of scope per the CR.
function TopHeader({ displayName, initials }: { displayName: string; initials: string }) {
  const router = useRouter();

  // AC1 — clears the in-memory session and redirects to /login, which then
  // shows the sign-in form (the session is genuinely gone, so /login's own
  // mount-effect guard falls through to 'unauthenticated' with no special
  // case needed here).
  function handleLogout() {
    clearSessionToken();
    router.push('/login');
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6">
      {/* AC2 — the browser's own back navigation, not a fixed destination. */}
      <IconButton label="Back" onClick={() => router.back()} className="text-slate-600">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </IconButton>
      <IconButton disabled label="Open navigation" className="text-slate-600 disabled:opacity-100">
        <MenuIcon className="h-5 w-5" aria-hidden />
      </IconButton>
      <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>

      <div className="ml-auto flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            disabled
            placeholder="Search anything..."
            aria-label="Search"
            className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-500 placeholder:text-slate-400"
          />
        </div>

        <IconButton disabled label="Notifications" className="relative text-slate-600 disabled:opacity-100">
          <Bell className="h-5 w-5" aria-hidden />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            5
          </span>
        </IconButton>

        <IconButton
          label="Log out"
          onClick={handleLogout}
          className="flex h-auto w-auto items-center gap-2"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-slate-900">{displayName}</span>
            <span className="block text-xs text-slate-500">Admin</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden />
        </IconButton>
      </div>
    </header>
  );
}

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC2) — day (no
// leading zero), short month name, full year, matching the mock's existing
// "12 Aug 2025" style. A hand-rolled month table rather than
// `Intl.DateTimeFormat`/`toLocaleDateString`: this file has no existing
// date-formatting precedent to follow, and a fixed table keeps the output
// deterministic regardless of the runtime's ICU data, with no dependency
// added (B6).
function formatWelcomeDate(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

// cr-dashboard-recent-menu-changes, T01 (AC2) — reuses `formatWelcomeDate`'s
// day/short-month/year for the date portion and appends zero-padded
// hours:minutes, since a bare date alone doesn't distinguish same-day
// changes in the 5-item list. Same "no new dependency" rationale as
// `formatWelcomeDate` above.
function formatRecentChangeTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${formatWelcomeDate(date)}, ${hours}:${minutes}`;
}

// cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1/AC2) —
// `displayName` comes from the real signed-in user (see TopHeader's own
// comment above for the "why" and the empty-string fallback before the
// session check resolves); the date button now renders the real current
// date instead of the hardcoded, now-stale "12 Aug 2025".
function WelcomeSection({ displayName }: { displayName: string }) {
  return (
    <Card className="flex flex-col items-start justify-between gap-3 p-6 sm:flex-row sm:items-center">
      <div>
        <p className="text-lg font-semibold text-slate-900">
          Good morning{displayName ? `, ${displayName}` : ''}! 👋
        </p>
        <p className="text-sm text-slate-500">Welcome to Smart Café Operations.</p>
      </div>
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-default"
      >
        {formatWelcomeDate(new Date())}
        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
      </button>
    </Card>
  );
}

interface KpiCardProps {
  icon: IconType;
  iconClassName: string;
  label: string;
  value: number | null;
  description: string;
}

// AC2/VC-CR-001 — `value` is null while loading/on error, so the card shows
// "—" rather than a stale or fabricated 0.
function KpiCard({ icon: Icon, iconClassName, label, value, description }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <span className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full', iconClassName)}>
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddMenuItemLink() {
  return (
    <Link href="/menu/new" className={cn(buttonVariants({ variant: 'primary' }))}>
      + Add Menu Item
    </Link>
  );
}

interface CategoryRow {
  id: string;
  name: string;
  itemCount: number;
  activeCount: number;
}

// cr-dashboard-recent-menu-changes, T01 (AC1/AC2) — `kind` is a closed union
// rather than a raw string so the two labels ("added"/"updated") can't drift
// from the render side that switches on them.
type MenuChangeKind = 'added' | 'updated';

interface RecentChangeRow {
  id: string;
  name: string;
  kind: MenuChangeKind;
  timestamp: string;
}

export function DashboardScreen() {
  const hasSession = useRequireSession();
  // cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1) —
  // read-only; `useRequireSession` above still owns the redirect-if-no-
  // session guard. `sessionUser` is `null` until the check resolves (or if
  // there's genuinely no valid session), in which case `displayName`/
  // `initials` fall back to `''` — TopHeader/WelcomeSection render that as
  // an empty name/initials rather than stale placeholder text.
  const sessionUser = useSessionUser();
  const displayName = sessionUser ? displayNameFromEmail(sessionUser.email) : '';
  const initials = sessionUser ? avatarInitialsFromEmail(sessionUser.email) : '';
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [categories, setCategories] = useState<cafe.MenuCategory[]>([]);
  const [items, setItems] = useState<cafe.MenuItem[]>([]);

  useEffect(() => {
    if (!hasSession) return;

    let cancelled = false;

    async function load() {
      try {
        const [categoriesResponse, itemsResponse] = await Promise.all([
          cafeService().get(cafe.CAFE_ROUTES.categories, cafe.menuCategoryListResponseSchema),
          cafeService().get(cafe.CAFE_ROUTES.items, cafe.menuItemListResponseSchema),
        ]);
        if (cancelled) return;
        // Same treatment as menu-list-screen.tsx: apiResponseSchema's
        // discriminated union allows `success: false` on a 2xx even though
        // neither list endpoint is documented to return it that way — this
        // is folded into the same error state as a thrown fetch error
        // rather than assumed away.
        if (!categoriesResponse.success || !itemsResponse.success) {
          throw new Error('Dashboard responses reported success: false');
        }
        setCategories(categoriesResponse.data);
        setItems(itemsResponse.data);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load dashboard data', err instanceof ApiClientError ? err.message : err);
        setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  // VC-CR-001's exact formula.
  const totalMenuItems = items.length;
  const activeItemsCount = items.filter((item) => item.isAvailable).length;
  const categoriesCount = categories.length;

  // AC3 — grouped by category, same source data as AC2. Status badge: an
  // "Active" category is one with at least one active item; "Inactive"
  // otherwise. `MenuCategory` itself carries no enabled/active flag of its
  // own (shared/contracts/src/cafe/menu.ts — id/name/sortOrder only), so
  // this derives the status from its items rather than a nonexistent
  // property. Reversible default per B8, logged in
  // scaffold/memory/DECISIONS.md.
  const categoryRows = useMemo<CategoryRow[]>(
    () =>
      categories.map((category) => {
        const categoryItems = items.filter((item) => item.categoryId === category.id);
        return {
          id: category.id,
          name: category.name,
          itemCount: categoryItems.length,
          activeCount: categoryItems.filter((item) => item.isAvailable).length,
        };
      }),
    [categories, items],
  );

  // cr-dashboard-recent-menu-changes, T01 (AC1/AC2/VC-CR-001/VC-CR-002) —
  // sorts a copy of `items` (`[...items]`, never `items` itself — it's still
  // read by `categoryRows`/the KPI counts above) by `updatedAt` descending,
  // caps at 5, and derives "added" vs "updated" purely from
  // `createdAt === updatedAt`.
  const recentChanges = useMemo<RecentChangeRow[]>(
    () =>
      [...items]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          name: item.name,
          kind: item.createdAt === item.updatedAt ? 'added' : 'updated',
          timestamp: formatRecentChangeTimestamp(item.updatedAt),
        })),
    [items],
  );

  const isLoading = status === 'loading';
  const isError = status === 'error';
  const isReady = status === 'ready';
  const isEmpty = isReady && categoryRows.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 lg:flex-row">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <TopHeader displayName={displayName} initials={initials} />
          <div className="flex flex-col gap-6 p-6">
            <WelcomeSection displayName={displayName} />

            <div role="region" aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                icon={ClipboardList}
                iconClassName="bg-indigo-100 text-indigo-600"
                label="Total Menu Items"
                value={isReady ? totalMenuItems : null}
                description="All menu items created"
              />
              <KpiCard
                icon={CheckCircle2}
                iconClassName="bg-green-100 text-green-600"
                label="Active Items"
                value={isReady ? activeItemsCount : null}
                description="Currently available items"
              />
              <KpiCard
                icon={Tag}
                iconClassName="bg-amber-100 text-amber-600"
                label="Categories"
                value={isReady ? categoriesCount : null}
                description="Menu categories"
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Menu Overview</CardTitle>
                  <CardDescription>Item and category counts by category</CardDescription>
                </div>
                <AddMenuItemLink />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    Loading dashboard…
                  </div>
                ) : null}

                {isError ? (
                  <p
                    role="alert"
                    className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
                    {LOAD_ERROR_MESSAGE}
                  </p>
                ) : null}

                {isEmpty ? <p className="py-8 text-center text-sm text-slate-500">{NO_CATEGORIES_MESSAGE}</p> : null}

                {isReady && !isEmpty ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2 font-semibold">Category</th>
                        <th className="px-2 py-2 font-semibold">Items</th>
                        <th className="px-2 py-2 font-semibold">Active Items</th>
                        <th className="px-2 py-2 font-semibold">Status</th>
                        <th className="px-2 py-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-2 py-3 font-medium text-slate-900">{row.name}</td>
                          <td className="px-2 py-3 text-slate-700">{row.itemCount}</td>
                          <td className="px-2 py-3 text-slate-700">{row.activeCount}</td>
                          <td className="px-2 py-3">
                            <Badge kind={row.activeCount > 0 ? 'ok' : 'neutral'}>
                              {row.activeCount > 0 ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-2 py-3 text-right">
                            <IconButton
                              disabled
                              label={`View ${row.name} details`}
                              className="h-auto w-auto rounded p-1 disabled:opacity-100"
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Recent Menu Changes</CardTitle>
                {/* Decorative — no activity list/route exists to view. */}
                <button type="button" disabled className="text-sm font-medium text-sky-700 disabled:cursor-default">
                  View all
                </button>
              </CardHeader>
              <CardContent>
                {/* cr-dashboard-recent-menu-changes, T01 (AC1-AC4) — gated
                    on `isReady` (loading/error render nothing here,
                    consistent with the Menu Overview table above owning the
                    shared spinner/error banner for this fetch). AC3: an
                    empty `recentChanges` (fetch succeeded, zero items)
                    falls back to the same NO_RECENT_ACTIVITY_MESSAGE, now a
                    genuine empty state rather than a permanent one. */}
                {isReady && recentChanges.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {recentChanges.map((change) => (
                      <li key={change.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{change.name}</p>
                          <p className="text-xs text-slate-500">{change.timestamp}</p>
                        </div>
                        <Badge kind={change.kind === 'added' ? 'ok' : 'info'}>
                          {change.kind === 'added' ? 'Added' : 'Updated'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {isReady && recentChanges.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">{NO_RECENT_ACTIVITY_MESSAGE}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
