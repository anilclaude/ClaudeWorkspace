'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, buttonVariants, cn } from '@app/ui';
import { cafe } from '@app/contracts';
import { ApiClientError } from '@app/frontend-core';
import { cafeService } from '@/lib/services';
import { useRequireSession } from '@/lib/use-require-session';

// Café — Menu Management PRD, T10 (AC3, AC5, AC6 display half): the admin
// menu list, matching
// docs/wireframes/cafe-menu-management/cafe-menu-list-default.png — title +
// subtitle, a "+ Add Item" button routing to T08/T09's /menu/new, category
// section headers grouping their items, and each item row showing
// name/price/availability badge/Edit link.
//
// Real data, not static: this task's scope was explicitly widened (per a
// logged user decision, scaffold/memory/DECISIONS.md "cafe-menu-management
// (T08 escalation, resolution 2)") to close the Authorization-header gap
// left open by T08/T09, because AC3/AC5/AC6 only mean something rendered
// against real fetched data — grouping, category order, and availability
// badge state are all statements about *data*, not markup. Fetches
// GET /menu/categories and GET /menu/items in parallel on mount and groups
// items under their category by categoryId.
//
// No client-side re-sort: T05's own service ordering (category sortOrder,
// then item createdAt within a category — see
// scaffold/memory/DECISIONS.md "cafe-menu-management T05") is exactly the
// order AC6 needs on screen, and this file's grouping logic below preserves
// both the categories array's order and each category's items array order
// exactly as returned, rather than re-sorting either.
//
// AC3 — an unavailable item stays visible here (with its own muted badge),
// distinct from the (not-yet-built) customer ordering screen this PRD never
// gives this admin list a "hide unavailable" toggle for. index.md's builder
// note: "The Unavailable badge... is deliberately shown alongside Available
// ones... that's AC3's requirement... rendered concretely, not an
// oversight."
//
// Loading/error/empty states: none of the three is drawn on the wireframe
// (B7 still requires them). Loading: a centered spinner, matching the
// login PRD's own `role="status"` spinner precedent (T11). Error (the
// fetch itself failing — network error, non-2xx, or a contract mismatch,
// e.g. today's no-session 401 per DECISIONS.md "cafe-menu-management T10"):
// a local role="alert" banner, matching AddMenuItemForm's SUBMIT_ERROR_MESSAGE
// precedent. Empty (no categories, or no items in any category): the exact
// copy index.md's own "Empty state" section specifies — "No menu items yet"
// with the same "+ Add Item" button — rather than an invented default.
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

const LOAD_ERROR_MESSAGE = 'Something went wrong loading the menu. Try again.';
const EMPTY_STATE_MESSAGE = 'No menu items yet';

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

// "+ Add Item" links to /menu/new (T08/T09's existing route) rather than a
// <Button onClick> — this is plain navigation, not a submission/action, so a
// real <a> (styled via Button's own exported `buttonVariants`, not a
// <button> nested inside it — that nesting is invalid HTML, interactive
// content inside interactive content) is the more correct element. Logged
// in scaffold/memory/DECISIONS.md ("cafe-menu-management T10").
function AddItemLink({ className }: { className?: string }) {
  return (
    <Link href="/menu/new" className={cn(buttonVariants({ variant: 'primary' }), className)}>
      + Add Item
    </Link>
  );
}

type LoadStatus = 'loading' | 'error' | 'ready';

export function MenuListScreen() {
  const hasSession = useRequireSession();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [categories, setCategories] = useState<cafe.MenuCategory[]>([]);
  const [items, setItems] = useState<cafe.MenuItem[]>([]);

  useEffect(() => {
    if (!hasSession) return;

    let cancelled = false;

    async function load() {
      try {
        const [categoriesResponse, itemsResponse] = await Promise.all([
          cafeService().get(cafe.CAFE_ROUTES.categories, cafe.menuCategoryListResponseSchema),
          cafeService().get(cafe.CAFE_ROUTES.items, cafe.menuItemListResponseSchema),
        ]);
        if (cancelled) return;
        // apiResponseSchema's discriminated union types `data` as `T | null`
        // until `success` is checked — neither list endpoint in this PRD is
        // documented to ever return `success: false` on a 2xx (unlike
        // login's uniform-failure-at-200 case), but the envelope shape
        // allows it, so this is treated the same as a thrown fetch error
        // rather than assumed away.
        if (!categoriesResponse.success || !itemsResponse.success) {
          throw new Error('Menu list responses reported success: false');
        }
        setCategories(categoriesResponse.data);
        setItems(itemsResponse.data);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load menu', err instanceof ApiClientError ? err.message : err);
        setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  // AC5/AC6 — group by categoryId, preserving both the categories response's
  // own order (category sortOrder, AC6) and each category's items in the
  // exact order the items response returned them (T05's category-then-
  // createdAt ordering) — no re-sort of either array.
  const itemsByCategoryId = useMemo(() => {
    const map = new Map<string, cafe.MenuItem[]>();
    for (const item of items) {
      const existing = map.get(item.categoryId);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.categoryId, [item]);
      }
    }
    return map;
  }, [items]);

  // Only category sections with at least one item are rendered, matching
  // cafe-menu-list-default.png (every drawn STARTERS/MAINS/BEVERAGES header
  // has items under it — no empty section is drawn). A category with zero
  // items isn't itself an AC/wireframe requirement to surface here. Reversible
  // default per B8, logged in scaffold/memory/DECISIONS.md
  // ("cafe-menu-management T10").
  const categoriesWithItems = categories.filter((category) => (itemsByCategoryId.get(category.id)?.length ?? 0) > 0);
  const isEmpty = status === 'ready' && categoriesWithItems.length === 0;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Menu Management</CardTitle>
          <CardDescription>Manage items and categories</CardDescription>
        </div>
        <AddItemLink />
      </CardHeader>
      <CardContent>
        {status === 'loading' ? (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading menu items…
          </div>
        ) : null}

        {status === 'error' ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
            {LOAD_ERROR_MESSAGE}
          </p>
        ) : null}

        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-slate-500">{EMPTY_STATE_MESSAGE}</p>
            <AddItemLink />
          </div>
        ) : null}

        {status === 'ready' && !isEmpty ? (
          <div className="flex flex-col gap-6">
            {categoriesWithItems.map((category) => (
              <section key={category.id}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {category.name}
                </h3>
                <ul>
                  {(itemsByCategoryId.get(category.id) ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-4 border-b border-slate-100 px-2 py-3 odd:bg-white even:bg-slate-50 last:border-b-0"
                    >
                      <span className="flex-1 font-medium text-slate-900">{item.name}</span>
                      <span className="w-16 text-right text-slate-700">{formatPrice(item.price)}</span>
                      <Badge kind={item.isAvailable ? 'ok' : 'neutral'}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                      {/* T11 builds the real edit screen — this route doesn't
                          exist yet. Placeholder destination chosen (not a
                          '#'/no-op) so the link is a real, reasonable target
                          the moment T11 lands, matching this task's own
                          instruction that the toggle control itself is out
                          of scope here. Logged in
                          scaffold/memory/DECISIONS.md
                          ("cafe-menu-management T10"). */}
                      <Link
                        href={`/menu/${item.id}/edit`}
                        className="text-sm text-sky-700 hover:text-sky-800 hover:underline"
                      >
                        Edit
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
