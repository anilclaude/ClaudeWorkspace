# CR — Logout button and back arrow on every authenticated screen

**Status:** completed
**Date:** 2026-08-13
**Amends:** `platform/docs/prd/_ACTIVE/login.md` §5 "Out of scope" — "Sign-out / logout capability" (still `_ACTIVE`, not `_SHIPPED`; its own text already anticipated this being picked up later).
**Build gate:** no — back-arrow mechanism and screen scope were already confirmed via clarifying question before this CR was written.

## What's changing

Add a logout control and a back arrow to every authenticated screen: `/dashboard`, `/menu`, `/menu/new`, `/menu/[id]/edit`. Logout clears the in-memory session (`cr-in-memory-session`) and returns to `/login`. The back arrow calls the browser's own back navigation (`router.back()`), not a fixed per-screen destination.

## Why

Explicit user request, the second half of "add a logout button and back arrow on each screen, dont store in local storage." Closes a gap the login PRD itself flagged as deliberately deferred ("Logout is now the dashboard PRD's responsibility, to be picked up when that PRD is planned") — there is no formal "dashboard PRD," so this CR is what picks it up. Depends on `cr-in-memory-session` (done) — logout needs an in-memory session to actually clear; there was nothing to clear before that CR.

## Acceptance Criteria

- AC1 — Every one of `/dashboard`, `/menu`, `/menu/new`, `/menu/[id]/edit` has a visible, working logout control. Activating it clears the session and redirects to `/login`, which then shows the sign-in form (not a redirect back, since the session is genuinely gone).
- AC2 — Every one of the same four screens has a visible back arrow. Activating it calls the browser's own back navigation (`router.back()`) — it goes to whichever page was actually visited before, not a fixed destination.
- AC3 — After logout, in-app navigation back to any of the four screens (e.g. via browser back) does not silently restore access — since the session is in-memory only, it's simply gone.
  **Superseded 2026-08-14 by `cr-session-guard-redirect-to-login`**: this AC's original text ("the screen's own existing loading/error handling... takes over from there, no new guard required by this CR itself") described the pre-guard behavior — a doomed fetch falling into each screen's generic error banner. That CR added exactly the guard this line said wasn't needed: post-logout, each screen now redirects straight to `/login` instead of showing an error. The "access is not restored" guarantee still holds; the *mechanism* proving it changed. See `scaffold/memory/DECISIONS.md`, "cr-session-guard-redirect-to-login T01 (review cycle 1 SHOULD-FIX)".

## Validation Contract (optional)

- VC-CR-001: Clicking logout on any of the four screens results in the in-memory session token being cleared and the URL being `/login`.
- VC-CR-002: Clicking the back arrow calls the router's back navigation, not a `push`/`replace` to a hardcoded path.
