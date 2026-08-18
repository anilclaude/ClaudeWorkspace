import { MenuListScreen } from '@/modules/menu';

// Admin menu list screen (cafe-menu-management T10, AC3/AC5/AC6 display
// half) — thin routing file only; the real markup/state lives in the menu
// module per repo-structure.md's module-wise convention
// (`src/modules/<feature>/`). AppShell ((app)/layout.tsx) already provides
// <main> and page padding.
//
// Route is `/menu`, not the wireframe's illustrative
// `app.example.com/admin/menu` — same reasoning already logged for T08's
// `/menu/new` (no `/admin` path segment exists anywhere in this codebase).
export default function MenuListPage() {
  return <MenuListScreen />;
}
