import { DashboardScreen } from '@/modules/dashboard';

// cr-dashboard-menu-management-link, T01 (AC1-AC6) — thin routing file only;
// the real markup/state lives in the dashboard module per
// repo-structure.md's module-wise convention (`src/modules/<feature>/`).
//
// Moved from (app)/dashboard/page.tsx to this dedicated (dashboard) route
// group by cr-remove-appshell-chrome-from-dashboard, T01 (AC1) — the URL
// (/dashboard) is unchanged, only the layout it renders through: this group's
// own layout.tsx (no AppShell top bar) instead of (app)/layout.tsx (AppShell
// top bar). See (dashboard)/layout.tsx's comment and
// scaffold/memory/DECISIONS.md, "cr-remove-appshell-chrome-from-dashboard
// T01 (build)".
export default function DashboardPage() {
  return <DashboardScreen />;
}
