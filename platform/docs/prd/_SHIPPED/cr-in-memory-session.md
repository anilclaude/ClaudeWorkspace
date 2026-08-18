# CR — Session token in-memory only, not localStorage

**Status:** completed
**Date:** 2026-08-13
**Amends:** `platform/docs/prd/_ACTIVE/login.md`'s AC10 (still `_ACTIVE`, not `_SHIPPED` — its only remaining gate is the unrelated session-expiry-banner HOLD, not this AC).
**Build gate:** no — the scope ambiguity (in-memory vs. zero persistence) was already resolved via an explicit clarifying question before this CR was written.

## What's changing

Move the session token from `localStorage` (`frontend/web/src/lib/session-storage.ts`) to in-memory application state (the existing Redux store). Normal in-app navigation (client-side routing between `/dashboard`, `/menu`, `/menu/new`, etc.) keeps working without re-login. A hard page reload, a new tab, or closing the browser loses the session and requires signing in again.

## Why

Explicit user request: "dont store in local storage, always go with login screen." This reverses AC10 as originally built — `session-storage.ts`'s own header comment chose `localStorage` specifically *because* it survives reload/new-tab, which is now the behavior being explicitly removed.

AC6 (redirect away from `/login` if already authenticated) is not reversed — it stays meaningful for same-session client-side navigation back to `/login`, it just no longer fires after a reload/new tab, since there's nothing in memory to find at that point.

This CR is also the prerequisite for a follow-up CR (logout button + back navigation) — logout needs an in-memory session to actually clear.

## Acceptance Criteria

- AC1 — After a successful login, navigating between screens via in-app links/routing (no full reload) keeps the user signed in — no session data is read from or written to `localStorage`/`sessionStorage` at any point.
- AC2 — Reloading the page, or opening the app in a new tab, does not restore a previous session — the user lands on `/login` with the form showing, not redirected to `/dashboard`.
- AC3 — `/login`'s existing "already authenticated → redirect to `/dashboard`" behavior (AC6) still works within the same browser session (no reload) — e.g. navigating back to `/login` via an in-app link while still logged in still redirects away.

## Validation Contract (optional)

- VC-CR-001: After login, `window.localStorage` and `window.sessionStorage` contain no session-token key at any point.
- VC-CR-002: Simulating a fresh page load (a new render of the app's root state, not just a route change) with no in-memory token present renders the login form, not a redirect.
