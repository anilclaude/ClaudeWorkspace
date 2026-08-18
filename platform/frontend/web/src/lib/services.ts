'use client';

import { createApiClient } from '@app/frontend-core';
import { readSessionToken } from './session-storage';

// Direct-to-service clients — no BFF layer. The browser calls each service by
// its NEXT_PUBLIC_ URL directly, and every response is validated against its
// published contract in @app/contracts before it reaches calling code.
//
// CORS is what makes this work at all: each service's CORS_ORIGIN must allow
// this app's origin, or every call here fails at the browser before the
// request is even sent. See backend/auth/src/main.ts and
// backend/core/src/main.ts.

// `name` is only used in the error message — the lookup itself must be a
// *static* `process.env.NEXT_PUBLIC_...` expression below (never
// `process.env[name]`). Next.js only inlines `NEXT_PUBLIC_*` vars into the
// client bundle for literal, static member-expression reads; a computed
// (bracket) read isn't textually recognizable at build time and silently
// resolves to `undefined` in the browser even though the value is correct in
// `.env`. See `services.test.ts` and `scaffold/memory/DECISIONS.md`, "T07
// (regression)".
function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const fetcher = (url: string, init?: Parameters<typeof fetch>[1]) => fetch(url, init);

export const authService = () =>
  createApiClient(required(process.env.NEXT_PUBLIC_AUTH_SERVICE_URL, 'NEXT_PUBLIC_AUTH_SERVICE_URL'), fetcher);
export const coreService = () =>
  createApiClient(required(process.env.NEXT_PUBLIC_CORE_SERVICE_URL, 'NEXT_PUBLIC_CORE_SERVICE_URL'), fetcher);
// cafe-menu-management T08 — first café-service caller. Same static
// process.env.X read as authService/coreService above (see the `required`
// comment) — never process.env[name].
//
// cafe-menu-management T10 closes the auth-header gap logged in
// scaffold/memory/DECISIONS.md ("cafe-menu-management T08" /
// "(T08 review escalation)"): every café endpoint this app calls
// (GET/POST /menu/categories, GET/POST /menu/items, etc.) is
// @RequireRoles('Admin')-guarded, so cafeService() needs an Authorization
// header attached. `readSessionToken` is passed as a getter (not called and
// inlined here) so the token is re-read fresh on every request, not
// snapshotted at the moment `cafeService()` happens to be constructed.
//
// No-session behavior: readSessionToken() returning null is not
// special-cased here — createApiClient simply sends the request with no
// Authorization header, which the backend's RolesGuard rejects (401). The
// caller (the menu list screen, T10) is expected to treat that the same as
// any other fetch failure: a clean error state, not a crash. Logged in
// scaffold/memory/DECISIONS.md ("cafe-menu-management T10").
export const cafeService = () =>
  createApiClient(
    required(process.env.NEXT_PUBLIC_CAFE_SERVICE_URL, 'NEXT_PUBLIC_CAFE_SERVICE_URL'),
    fetcher,
    readSessionToken,
  );
