# CR — Dashboard screen with a working Menu Management link

**Status:** completed
**Date:** 2026-08-13
**Amends:** net-new — replaces the login PRD's out-of-scope dashboard placeholder (`frontend/web/src/app/(app)/dashboard/page.tsx`, still `_ACTIVE`/unshipped, see `DECISIONS.md` "T07"); reuses `cafe-menu-management`'s shipped `GET /menu/categories`/`GET /menu/items` endpoints for real data.
**Build gate:** yes — this CR narrows a literal reading of the request (see "Why" and `DECISIONS.md`, "cr-dashboard-menu-management-link (planning)"); confirm the scope below matches intent before `/build` runs.

## What's changing

Replace the current one-line dashboard placeholder with a real `/dashboard` screen matching `platform/docs/wireframes/dashboard/CafeDashboard.png` — left nav, top header, welcome section, three KPI cards, and a Menu Overview table. Only the **Menu Management** nav item and the **+ Add Menu Item** button are real, working links (both to `/menu/new`); every other nav item and widget renders as drawn but is inert.

## Why

The wireframe draws a fully-built admin dashboard (order/kitchen/inventory/staff/loyalty/reports/analytics modules, a "Recent Menu Changes" activity feed) but almost none of that exists in this codebase yet — only menu management is shipped. Building the wireframe literally would mean a new audit-log subsystem and a dozen unplanned modules, which is full-PRD scope, not a CR. This CR instead renders the wireframe visually and wires real data only where it's already cheap and available (the same `GET /menu/categories`/`GET /menu/items` calls T10's admin list screen already makes), matching this codebase's existing precedent for inert placeholders (T08's Photo field, T10's deferred category options) rather than fabricating data or building unplanned modules. Full reasoning logged in `scaffold/memory/DECISIONS.md`.

## Acceptance Criteria

- AC1 — After a successful login, the user lands on `/dashboard`, which renders the widgets/layout drawn in `CafeDashboard.png` (left nav, top header, welcome section, KPI cards, Menu Overview table) in place of the current one-line placeholder.
- AC2 — The three KPI cards (Total Menu Items, Active Items, Categories) show real counts derived from `GET /menu/items` and `GET /menu/categories` — not hardcoded or fake numbers.
- AC3 — The Menu Overview table lists each category with its item count, active-item count, and an "Active" status badge, using the same data as AC2 grouped by category.
- AC4 — The "Menu Management" left-nav item is the only real navigation link in the entire left nav. Clicking it navigates to `/menu/new`. Every other left-nav item (Orders, Kitchen Operations, Inventory, Purchase & Suppliers, Staff Management, Attendance & Roster, Customers, Loyalty Program, Reports, Analytics, Notifications, AI Assistant, Settings) renders as drawn but is inert — clicking it does not navigate and does not error.
- AC5 — The "+ Add Menu Item" button in the Menu Overview card header also navigates to `/menu/new` (same destination as AC4).
- AC6 — "Recent Menu Changes" renders an explicit empty/placeholder state (e.g. "No recent activity") rather than fabricated entries — no activity/audit-log data source exists in this codebase.
  **Superseded 2026-08-14 by `cr-dashboard-recent-menu-changes`**: `cafe.MenuItem` already carries `createdAt`/`updatedAt` on every item (a real, already-fetched data source this AC's own text didn't account for) — the card now derives a real "5 most recently changed items" list from that, falling back to this AC's "No recent activity" text only when there are genuinely zero items. See `scaffold/memory/DECISIONS.md`, "cr-dashboard-recent-menu-changes (planning)".

## Validation Contract (optional)

- VC-CR-001: Given real category/item data from `GET /menu/categories` and `GET /menu/items`, the KPI cards compute Total Menu Items = `items.length`, Active Items = `items.filter(i => i.isAvailable).length`, Categories = `categories.length`.
- VC-CR-002: Clicking any left-nav item other than Dashboard or Menu Management does not change the URL and produces no console error.
