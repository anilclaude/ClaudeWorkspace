import { EditMenuItemScreen } from '@/modules/menu';

// Edit Menu Item screen (cafe-menu-management T11, AC3/AC4) — thin routing
// file only; the real markup/state lives in the menu module per
// repo-structure.md's module-wise convention (`src/modules/<feature>/`).
// AppShell ((app)/layout.tsx) already provides <main> and page padding.
//
// Route is `/menu/${item.id}/edit` — already decided by T10's list screen
// (each item row's "Edit" link, scaffold/memory/DECISIONS.md
// "cafe-menu-management T10 (build)"), this task just adds the matching
// page. `params` is a Promise here (Next.js 15+ App Router convention for
// dynamic segments) — awaited once, then passed down as a plain string.
interface EditMenuItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMenuItemPage({ params }: EditMenuItemPageProps) {
  const { id } = await params;
  return <EditMenuItemScreen itemId={id} />;
}
