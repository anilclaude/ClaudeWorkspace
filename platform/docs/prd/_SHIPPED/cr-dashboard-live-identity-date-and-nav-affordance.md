# CR — Dashboard: real user identity, real date, clickable-but-inert nav

**Status:** completed
**Date:** 2026-08-14
**Amends:** `platform/frontend/web/src/modules/dashboard/components/dashboard-screen.tsx` (`WelcomeSection`, `TopHeader`'s user identity block, `InertNavItem`) — all originally hardcoded placeholder content matching the dashboard wireframe, per `cr-dashboard-menu-management-link`'s own scope.
**Build gate:** no — three small, independent, low-risk display/affordance changes; reuses the already-tested `checkSession` session primitive, no new backend/contract surface.

## What's changing

1. The welcome message ("Good morning, John!") and the header's user block ("John Smith" / "Admin" / "JS" avatar initials) currently show hardcoded mock text regardless of who's actually logged in. This CR makes the name/initials reflect the real signed-in user.
2. The date shown next to the welcome message ("12 Aug 2025") is a hardcoded, now-stale mock. This CR makes it show the real current date.
3. Every left-nav item other than "Menu Management" is currently a `disabled` button (greyed out, not clickable at all). This CR makes them look and behave like normal clickable nav items — hover state, enabled, focusable — but clicking one still does nothing and the screen stays exactly where it is (no navigation).

## Why

Explicit user request. Investigated what real identity data actually exists before designing a fix: `backend/auth`'s `User` entity has no name field anywhere in the system — only `id`, `email`, `passwordHash`, `role`. The signed JWT and `LoginUser` contract carry `email` (and `role`, JWT-only), never a name. Inventing a name field would be a new cross-boundary contract change (CLAUDE.md #6), well beyond this CR's scope — so the display name is derived from the one real, already-available piece of identity: the signed-in user's email.

## Acceptance Criteria

- AC1 — The welcome message and the header's user block both reflect the real logged-in user's identity (derived from their email — e.g. `admin@example.com` displays as "Admin"), not the hardcoded "John"/"John Smith". Avatar initials are derived the same way, not hardcoded "JS".
- AC2 — The date shown next to the welcome message is the real current date (client system date), formatted consistently with the mock's existing style (day, short month, year), not a hardcoded/stale value.
- AC3 — Every left-nav item other than "Menu Management" (and Dashboard, which stays a highlighted-but-non-navigating current-page indicator) is no longer `disabled`: it has the same hover affordance a real nav link has, is keyboard-focusable, and looks clickable. Clicking it does not navigate anywhere, does not throw a console error, and the screen's URL does not change — behaviorally identical to today, only the enabled/visual state changes.

## Validation Contract (optional)

- VC-CR-001: With a valid session for `admin@example.com`, the welcome message and header both display "Admin" (or the derived-from-email equivalent), never "John"/"John Smith".
- VC-CR-002: Clicking any inert left-nav item leaves `window.location.href` unchanged and produces no console error, exactly as before this CR — only the item's `disabled` state and hover styling change.
