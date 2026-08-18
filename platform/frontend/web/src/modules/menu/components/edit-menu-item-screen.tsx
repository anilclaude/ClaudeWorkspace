'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@app/ui';
import { cafe } from '@app/contracts';
import { ApiClientError } from '@app/frontend-core';
import { cafeService } from '@/lib/services';
import { useRequireSession } from '@/lib/use-require-session';
import { AddMenuItemForm } from './add-menu-item-form';

// Café — Menu Management PRD, T11 (AC3, AC4): the real screen behind
// `/menu/[id]/edit` (the route T10's list screen already links every item's
// "Edit" to). Thin routing file only at
// app/(app)/menu/[id]/edit/page.tsx, per repo-structure.md's module-wise
// convention — the fetch/state/pre-fill logic lives here.
//
// No single-item GET /menu/items/:id endpoint exists — only GET /menu/items
// (full list, includes unavailable items per AC3) and
// GET /menu/items/available. Fetching the full list and finding the item
// client-side by id is the same pattern T10 already established for
// categories+items grouping — pragmatic, no backend change needed. Logged
// in scaffold/memory/DECISIONS.md ("cafe-menu-management T11").
//
// GET /menu/categories is fetched the same way T10 already does (parallel
// Promise.all, same cafeService()/TokenProvider plumbing) — reused, not
// reinvented: the Category <select> needs real options to display an
// existing item's categoryId correctly, a gap T08/T09 could defer for
// /menu/new but edit mode can't (see add-menu-item-form.tsx's own comment).
//
// Loading/error/not-found states (B7 — none of the three drawn on any
// wireframe; this screen has none of its own per index.md's "States not
// drawn"): loading mirrors MenuListScreen's (T10) own role="status"
// spinner; error (the fetch itself failing — network error, non-2xx, or a
// contract mismatch) mirrors its role="alert" banner. not-found is a
// distinct case, not folded into "error": the fetch can succeed while the
// id in the URL simply doesn't match any item in the list (a stale Edit
// link, or a hand-edited URL) — given its own message and a link back to
// /menu, rather than reading as "the whole menu failed to load."
//
// cr-session-guard-redirect-to-login, T01 (AC1-AC3): the categories/items
// fetch below no longer fires unconditionally on mount. `useRequireSession`
// (@/lib/use-require-session) runs first; with no valid session it redirects
// straight to /login instead of letting this fetch 401 into the generic
// LOAD_ERROR_MESSAGE banner above. The fetch effect is gated on `hasSession`
// so it only ever fires once a session is confirmed valid — while that
// check is still running (or redirecting), `status` stays at its default
// 'loading', so this renders the same loading state as before, not a new
// one.

const LOAD_ERROR_MESSAGE = 'Something went wrong loading this item. Try again.';
const NOT_FOUND_MESSAGE = 'This menu item could not be found.';

type LoadStatus = 'loading' | 'error' | 'not-found' | 'ready';

export interface EditMenuItemScreenProps {
  itemId: string;
}

function EditMenuItemShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Edit Menu Item</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EditMenuItemScreen({ itemId }: EditMenuItemScreenProps) {
  const hasSession = useRequireSession();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [item, setItem] = useState<cafe.MenuItem | null>(null);
  const [categories, setCategories] = useState<cafe.MenuCategory[]>([]);

  useEffect(() => {
    if (!hasSession) return;

    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const [categoriesResponse, itemsResponse] = await Promise.all([
          cafeService().get(cafe.CAFE_ROUTES.categories, cafe.menuCategoryListResponseSchema),
          cafeService().get(cafe.CAFE_ROUTES.items, cafe.menuItemListResponseSchema),
        ]);
        if (cancelled) return;
        // Same apiResponseSchema discriminated-union guard T10 already
        // established — `data` is `T | null` until `success` is checked.
        if (!categoriesResponse.success || !itemsResponse.success) {
          throw new Error('Menu edit responses reported success: false');
        }
        const found = itemsResponse.data.find((candidate) => candidate.id === itemId);
        if (!found) {
          setStatus('not-found');
          return;
        }
        setCategories(categoriesResponse.data);
        setItem(found);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load menu item', err instanceof ApiClientError ? err.message : err);
        setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [itemId, hasSession]);

  if (status === 'loading') {
    return (
      <EditMenuItemShell>
        <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading item…
        </div>
      </EditMenuItemShell>
    );
  }

  if (status === 'error') {
    return (
      <EditMenuItemShell>
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
          {LOAD_ERROR_MESSAGE}
        </p>
      </EditMenuItemShell>
    );
  }

  if (status === 'not-found') {
    return (
      <EditMenuItemShell>
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
          {NOT_FOUND_MESSAGE}
        </p>
        <Link href="/menu" className="mt-4 inline-block text-sm text-sky-700 hover:text-sky-800 hover:underline">
          Back to Menu
        </Link>
      </EditMenuItemShell>
    );
  }

  return item ? <AddMenuItemForm mode="edit" item={item} categories={categories} /> : null;
}
