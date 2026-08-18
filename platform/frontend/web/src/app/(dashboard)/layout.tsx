// cr-remove-appshell-chrome-from-dashboard, T01 (AC1/VC-CR-001) — /dashboard
// gets its own route group, sibling to (app), rather than reusing
// (app)/layout.tsx or making AppShell (src/components/app-shell.tsx)
// pathname-aware. AppShell's shared top bar (the "Platform" brand link +
// the "Menu" nav link) is deliberately never imported here, so it cannot
// render on /dashboard: the dashboard's own header (search, notifications,
// user menu — see modules/dashboard/components/dashboard-screen.tsx's
// TopHeader) is the only top chrome shown.
//
// This mirrors the existing (app)/(auth) route-group precedent (no
// pathname-aware conditional layout logic existed anywhere in this
// codebase before this task) and is the least invasive option: it leaves
// (app)/layout.tsx and app-shell.tsx completely untouched, so /menu,
// /menu/new, and /menu/[id]/edit — which still depend on AppShell's "Menu"
// link as their only in-app path back to /menu, since the Add Menu Item
// form's Cancel button is inert — keep rendering exactly as they do today
// (AC2/VC-CR-002). Full reasoning: scaffold/memory/DECISIONS.md,
// "cr-remove-appshell-chrome-from-dashboard T01 (build)".
//
// The outer wrapper (min-h-screen bg-slate-50) and <main> container
// (mx-auto max-w-6xl px-4 py-8) are copied from AppShell's own markup, minus
// its <header>, so the only visible change on /dashboard is the missing top
// bar — not a wider layout change, which is out of this task's scope (B1).
export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
