'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Menu, X } from 'lucide-react';
import { Button, IconButton, cn } from '@app/ui';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/ui.slice';
import { clearSessionToken } from '@/lib/session-storage';

export interface NavItem {
  href: string;
  label: string;
}

// The app frame every page renders inside: brand, primary nav, main region.
// Pages stay thin — they render content, not chrome.
//
// Nav items are passed in rather than hardcoded here so a feature module never
// has to edit this component to add a route.
//
// cr-logout-and-back-navigation, T01 (AC1/AC2) — shared by every route that
// still renders through this shell (/menu, /menu/new, /menu/[id]/edit, via
// (app)/layout.tsx), so adding the back arrow and logout control here once
// covers all three at once, rather than three separate per-screen
// implementations. AppShell had no user-menu/logout equivalent before this.
export function AppShell({ navItems, children }: { navItems: NavItem[]; children: ReactNode }) {
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const dispatch = useAppDispatch();
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <button
            type="button"
            aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={sidebarOpen}
            onClick={() => dispatch(toggleSidebar())}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 sm:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* AC2 — the browser's own back navigation, not a fixed
              destination. */}
          <IconButton label="Back" onClick={() => router.back()} className="text-slate-600">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </IconButton>

          <Link href="/" className="font-semibold text-slate-900">
            Platform
          </Link>

          <nav aria-label="Primary" className="hidden gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* AC1 — visible, working logout control. */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            className="ml-auto"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </Button>
        </div>

        {sidebarOpen ? (
          <nav
            aria-label="Primary mobile"
            className={cn('border-t border-slate-200 px-4 py-2 sm:hidden')}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
