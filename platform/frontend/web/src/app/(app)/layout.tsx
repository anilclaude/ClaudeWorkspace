import { AppShell, type NavItem } from '@/components/app-shell';

// Signed-in app chrome. Every route in this group renders inside the shell.
// Add an entry here when a feature module ships a top-level route.
//
// "Menu" added by cafe-menu-management T10 — T08's own note deferred this
// exact entry until the list screen (the natural link target, /menu)
// existed to link to.
const navItems: NavItem[] = [{ href: '/menu', label: 'Menu' }];

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell navItems={navItems}>{children}</AppShell>;
}
