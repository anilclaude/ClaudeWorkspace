'use client';

import { useEffect, useState } from 'react';
import { checkSession } from '@app/frontend-core';
import { readSessionToken } from '@/lib/session-storage';

// cr-dashboard-live-identity-date-and-nav-affordance, T01 (AC1/VC-CR-001) —
// a read-only companion to `useRequireSession` (@/lib/use-require-session):
// that hook owns the redirect-if-no-session guard for the four protected
// screens; this hook is purely for what to display once a session is
// confirmed valid. It reuses the same `checkSession`/`readSessionToken`
// primitives, but never calls `router.push` and never duplicates the guard
// behavior — a screen using both hooks together still gets exactly one
// redirect decision (from `useRequireSession`), and a separate, purely
// cosmetic identity value from this one.
export function useSessionUser(): { email: string } | null {
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    try {
      const session = checkSession(readSessionToken());
      if (session.valid) {
        setUser({ email: session.user.email });
        return;
      }
    } catch (err) {
      // Fails closed to "no user to display" — the same "no session" outcome
      // as an explicitly invalid token, not a crash. `useRequireSession`
      // (already mounted alongside this hook on every real screen) is what
      // actually redirects away in this case.
      console.error('Failed to read the current session user', err);
    }
    setUser(null);
    // Deliberately empty — runs once per mount, mirroring
    // useRequireSession's own empty dependency array.
  }, []);

  return user;
}

// No "name" field exists anywhere in this system (see the CR's "Why"
// section) — this derives a cosmetic display name from the one real piece of
// identity available, the email's local-part. Capitalizes only the first
// letter; everything else is lowercased as-is, no further splitting on dots/
// dashes (e.g. `admin@example.com` -> "Admin", `jane.doe@example.com` ->
// "Jane.doe").
export function displayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  if (!localPart) return '';
  return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
}

// Same source, 2-letter avatar initials: the local-part's first two
// characters, uppercased (e.g. `admin@example.com` -> "AD").
export function avatarInitialsFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  return localPart.slice(0, 2).toUpperCase();
}
