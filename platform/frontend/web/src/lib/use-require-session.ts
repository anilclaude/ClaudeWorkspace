'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkSession } from '@app/frontend-core';
import { readSessionToken } from '@/lib/session-storage';

// cr-session-guard-redirect-to-login, T01 (AC1-AC3) — a shared session
// guard for the four protected screens (dashboard, menu list, add menu
// item, edit menu item). Every one of those screens fires its own data
// fetch unconditionally on mount today, with no check for whether a
// session exists first — this hook reuses the already-tested
// `checkSession`/`readSessionToken` pair /login's own T11 mount-check
// (app/(auth)/login/page.tsx) already established, rather than inventing a
// second session-check mechanism.
//
// If no valid session exists on mount, this redirects straight to /login
// (AC1) via `router.push` — a client-side navigation, not a hard reload
// (AC3), matching how logout already navigates
// (cr-logout-and-back-navigation). If a valid session exists, the hook's
// return value flips to `true` and never redirects (AC2) — each screen
// gates its own mount-fetch effect on this return value so the fetch only
// ever fires once a session is confirmed valid, and a genuine mid-session
// failure (a real network error, a 500, or any other non-auth failure)
// still reaches that screen's own existing error banner unchanged, since
// this hook never touches that fetch's error handling at all.
//
// Effect shape mirrors /login page.tsx's own T11 mount-check (see that
// file's comment for the full reasoning): a deliberately empty dependency
// array, since this must run exactly once per mount — not on every
// re-render this effect's own `setState` call triggers, and not on every
// `router` identity change (Next's real `useRouter()` is stable in
// practice; re-running this on a router-identity change instead would risk
// more than one `router.push('/login')` for the same missing session).
//
// Fails open to "redirect", the mirror image of /login's own T11 guard
// (which fails open to the sign-in form on a thrown check): here, a thrown
// `checkSession`/`readSessionToken` call is treated the same as "no
// session" — logged via console.error and redirected — rather than
// assuming a session exists and letting a protected screen's fetch fire
// (and likely 401) when the check itself is broken. Logged in
// scaffold/memory/DECISIONS.md ("cr-session-guard-redirect-to-login T01
// (build)").
export function useRequireSession(): boolean {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    try {
      const session = checkSession(readSessionToken());
      if (session.valid) {
        setHasSession(true);
        return;
      }
    } catch (err) {
      console.error('Failed to check for an existing session', err);
    }
    router.push('/login');
    // Deliberately empty — see the module comment above.
  }, []);

  return hasSession;
}
