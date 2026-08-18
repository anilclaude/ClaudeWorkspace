# CR — Remove the shared app-shell top bar from the dashboard

**Status:** completed
**Date:** 2026-08-13
**Amends:** `platform/docs/prd/_CHANGE_REQUESTS/cr-dashboard-menu-management-link.md` — its task is `done`, but that CR hasn't been shipped via `/wrap` yet (`Status: open`), so it can't be cited as a `_SHIPPED/` file in the strict sense; cited directly with that noted.
**Build gate:** yes — "dashboard-only, not global" is an interpretive scoping call with a discovered navigation-dead-end risk behind it (see "Why"); confirm before `/build` runs.

## What's changing

`/dashboard` currently renders two stacked header bars: the shared `AppShell` top bar (a "Platform" brand link + a "Menu" nav link, used by every screen in the `(app)` route group) above the dashboard's own purpose-built header (search, notifications, user menu). Remove the shared `AppShell` bar from `/dashboard` only — it stays exactly as-is on `/menu`, `/menu/new`, and `/menu/[id]/edit`.

## Why

The dashboard's own left nav already has a "Menu Management" entry that navigates to `/menu/new` — the shared bar's generic "Menu" link is redundant on this specific screen. This was already flagged as a wireframe-fidelity deviation during the previous CR's review (two chrome bars where the wireframe draws one); this CR is the explicit request to close it.

Checked for a navigation dead-end before scoping this to `/dashboard` only: the Add Menu Item form's "Cancel" button has no handler at all — it does nothing — so the shared bar's "Menu" link is currently the *only* in-app way back to `/menu` from `/menu/new` or the edit screen. Removing the bar globally would strand a user there with no way back except the browser's own back button. Keeping it on every route except `/dashboard` avoids that; `/dashboard` never relied on it in the first place. Full reasoning in `scaffold/memory/DECISIONS.md`, "cr-remove-appshell-chrome-from-dashboard (planning)".

## Acceptance Criteria

- AC1 — On `/dashboard`, the shared `AppShell` top bar (the "Platform" brand link and the "Menu" nav link) does not render. The dashboard's own header is the only top chrome shown.
- AC2 — On `/menu`, `/menu/new`, and `/menu/[id]/edit`, the shared `AppShell` top bar continues to render exactly as it does today — unchanged.

## Validation Contract (optional)

- VC-CR-001: Navigating to `/dashboard` renders no "Platform" brand link and no nav link labeled "Menu" outside the dashboard's own "Menu Management" left-nav item.
- VC-CR-002: Navigating to `/menu`, `/menu/new`, or `/menu/[id]/edit` still renders the "Platform" and "Menu" links exactly as before this change.
