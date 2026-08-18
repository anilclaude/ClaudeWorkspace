import { AddMenuItemScreen } from '@/modules/menu';

// Add Menu Item screen (cafe-menu-management T08, AC1/AC5) — thin routing
// file only; the real markup/state lives in the menu module per
// repo-structure.md's module-wise convention (`src/modules/<feature>/`).
// AppShell ((app)/layout.tsx) already provides <main> and page padding.
//
// Route is `/menu/new`, not the wireframe's illustrative
// `app.example.com/admin/menu/new` — this codebase has no `/admin` path
// segment anywhere (e.g. `/dashboard`, also an authenticated-app-only
// screen, isn't under one either), so `/admin` in the wireframe's browser
// chrome is read as scene-setting for "this is an admin screen," not a
// literal route to reproduce. Logged in scaffold/memory/DECISIONS.md
// ("cafe-menu-management T08").
//
// cr-add-menu-category-options T01 (AC1, AC2): renders `AddMenuItemScreen`
// (fetches real `GET /menu/categories` and passes them down) instead of
// `AddMenuItemForm` directly — the form alone never had real category
// options to render on this route, since `mode` defaulted to `'add'` with
// no `categories` prop supplied. Mirrors `/menu/[id]/edit/page.tsx`'s own
// screen-wrapper shape.
export default function NewMenuItemPage() {
  return <AddMenuItemScreen />;
}
