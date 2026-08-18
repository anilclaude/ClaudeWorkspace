'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@app/ui';
import { cafe } from '@app/contracts';
import { ApiClientError } from '@app/frontend-core';
import { cafeService } from '@/lib/services';
import { useRequireSession } from '@/lib/use-require-session';
import { AddMenuItemForm } from './add-menu-item-form';

// cr-add-menu-category-options T01 (AC1, AC2): the real screen behind
// `/menu/new`. Thin routing file only at app/(app)/menu/new/page.tsx, per
// repo-structure.md's module-wise convention — the categories fetch/
// loading/error logic lives here, mirroring EditMenuItemScreen's own shape
// (cafe-menu-management T11) rather than reinventing it. Simpler than that
// screen: /menu/new has no existing item to find/pre-fill, so only
// GET /menu/categories is needed here, not GET /menu/items too.
//
// Why a separate wrapper rather than a fetch inside add-menu-item-form.tsx
// itself: matches the existing edit-screen precedent, keeping fetch/
// loading/error concerns out of the shared form component (used by both
// add and edit modes) — same separation EditMenuItemScreen already
// established. Logged in scaffold/memory/DECISIONS.md
// ("cr-add-menu-category-options T01 (build)").
//
// Loading/error states (B7 — this CR adds no new wireframe; the existing
// cafe-menu-add-default.png draws none of the three states, per this
// task's own ledger P2 note): loading mirrors EditMenuItemScreen/
// MenuListScreen's own role="status" spinner; error (the fetch itself
// failing — network error, non-2xx, or a contract mismatch) mirrors their
// role="alert" banner. There is no not-found case here (unlike edit mode)
// since there's no id to resolve.
//
// cr-session-guard-redirect-to-login, T01 (AC1-AC3): the categories fetch
// below no longer fires unconditionally on mount. `useRequireSession`
// (@/lib/use-require-session) runs first; with no valid session it redirects
// straight to /login instead of letting this fetch 401 into the generic
// LOAD_ERROR_MESSAGE banner above. The fetch effect is gated on `hasSession`
// so it only ever fires once a session is confirmed valid — while that
// check is still running (or redirecting), `status` stays at its default
// 'loading', so this renders the same loading state as before, not a new
// one.

const LOAD_ERROR_MESSAGE = 'Something went wrong loading categories. Try again.';

type LoadStatus = 'loading' | 'error' | 'ready';

function AddMenuItemShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Add Menu Item</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AddMenuItemScreen() {
  const hasSession = useRequireSession();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [categories, setCategories] = useState<cafe.MenuCategory[]>([]);

  useEffect(() => {
    if (!hasSession) return;

    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const response = await cafeService().get(
          cafe.CAFE_ROUTES.categories,
          cafe.menuCategoryListResponseSchema,
        );
        if (cancelled) return;
        // Same apiResponseSchema discriminated-union guard T10/T11 already
        // established — `data` is `T | null` until `success` is checked.
        if (!response.success) {
          throw new Error('Menu categories response reported success: false');
        }
        setCategories(response.data);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load menu categories', err instanceof ApiClientError ? err.message : err);
        setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  if (status === 'loading') {
    return (
      <AddMenuItemShell>
        <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading categories…
        </div>
      </AddMenuItemShell>
    );
  }

  if (status === 'error') {
    return (
      <AddMenuItemShell>
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
          {LOAD_ERROR_MESSAGE}
        </p>
      </AddMenuItemShell>
    );
  }

  return <AddMenuItemForm mode="add" categories={categories} />;
}
