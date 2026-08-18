# CR — Redirect to login instead of a generic error when the session is gone

**Status:** completed
**Date:** 2026-08-14
**Amends:** `platform/frontend/web/src/modules/dashboard/components/dashboard-screen.tsx`, `platform/frontend/web/src/modules/menu/components/menu-list-screen.tsx`, `platform/frontend/web/src/modules/menu/components/add-menu-item-screen.tsx`, `platform/frontend/web/src/modules/menu/components/edit-menu-item-screen.tsx` (all four protected screens' own mount-fetch effects); `platform/frontend/libs/core/src/session.ts`'s header comment (its "no dashboard-side use of this function today" note is superseded); `platform/docs/prd/_CHANGE_REQUESTS/cr-logout-and-back-navigation.md`'s AC3 (its "no new guard required" text is superseded — see that file's own AC3 note).
**Build gate:** no — reuses the existing, already-tested `checkSession` primitive; the new code is one thin hook plus four mechanical call-site changes.

## What's changing

Every protected screen (`/dashboard`, `/menu`, `/menu/new`, `/menu/[id]/edit`) currently fires its data fetch unconditionally on mount, with no check for whether a session exists first. When the in-memory session is gone (e.g. a browser refresh, by `cr-in-memory-session`'s own deliberate design), the fetch predictably 401s and each screen shows its own generic "Something went wrong loading ___. Try again." banner — which reads as a server problem, not "you're signed out."

This CR adds a shared session guard (`useRequireSession`, wrapping the existing `checkSession(readSessionToken())` from `@app/frontend-core`) to all four screens. If no valid session exists on mount, the screen redirects straight to `/login` instead of firing its data fetch or showing the generic error banner.

## Why

User-reported: refreshing the browser while on the dashboard shows "Something went wrong loading the dashboard. Try again." The expected behavior, per the user, is that a refresh should be treated as a sign-out — return to `/login` and ask the user to sign in again — not surface a generic error. Investigated live and in code: this exact gap exists identically on all four protected screens, not just the dashboard, since they all share the same "fetch unconditionally, catch into a generic error" pattern with no session check anywhere in the app today.

## Acceptance Criteria

- AC1 — On each of `/dashboard`, `/menu`, `/menu/new`, `/menu/[id]/edit`: mounting the screen with no valid session (token missing or expired) redirects immediately to `/login`, which then shows the sign-in form. The screen's own generic `LOAD_ERROR_MESSAGE` banner does not appear in this case.
- AC2 — With a valid session, every one of the four screens behaves exactly as before this CR: the same data fetch fires, the same loading/ready/empty states render, and a genuine mid-session failure (a real network error, a 500, or any non-auth failure) still shows the screen's own existing error banner, unchanged.
- AC3 — The redirect is a client-side navigation to `/login` (not a hard reload), consistent with how logout already navigates (`cr-logout-and-back-navigation`).

## Validation Contract (optional)

- VC-CR-001: Given no valid session token, mounting any of the four protected screens results in `router.push('/login')` being called and no data-fetch network call being made.
- VC-CR-002: Given a valid session token, mounting any of the four protected screens makes its normal data-fetch call(s), unchanged from pre-CR behavior.
