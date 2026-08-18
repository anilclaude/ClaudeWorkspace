import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardGroupLayout from './layout';

// cr-remove-appshell-chrome-from-dashboard, T01 (AC1) — this layout
// deliberately never imports AppShell (src/components/app-shell.tsx), so
// there is no "Platform" brand link and no "Menu" nav link anywhere in the
// /dashboard route tree. Proven directly against the layout component
// itself (the thing that actually controls what renders on /dashboard),
// not inferred from AppShell's own behavior elsewhere.
describe('DashboardGroupLayout', () => {
  it('VC-CR-001 — renders children with no AppShell top bar (no "Platform" brand link, no "Menu" nav link)', () => {
    render(
      <DashboardGroupLayout>
        <p>dashboard content</p>
      </DashboardGroupLayout>,
    );

    expect(screen.getByText('dashboard content')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Platform' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Menu' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
  });
});
