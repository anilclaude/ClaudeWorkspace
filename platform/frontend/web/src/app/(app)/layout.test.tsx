import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '@/store/provider';
import AppGroupLayout from './layout';

// cr-logout-and-back-navigation, T01 — app-shell.tsx now calls useRouter()
// for its new back arrow/logout control, so every render through this
// layout needs a mocked 'next/navigation' the way login/page.test.tsx
// already establishes the pattern.
const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}));

// cr-remove-appshell-chrome-from-dashboard, T01 (AC2) — proves the shared
// AppShell top bar still renders exactly as before on every route that
// still goes through this layout (/menu, /menu/new, /menu/[id]/edit — none
// of which this task touches). /dashboard moved out to its own (dashboard)
// route group with a slimmer layout (see (dashboard)/layout.test.tsx's
// VC-CR-001) precisely so this file, and app-shell.tsx itself, never had to
// change.
describe('AppGroupLayout', () => {
  it('VC-CR-002 — still renders the AppShell "Platform" brand link and "Menu" nav link, unchanged', () => {
    render(
      <StoreProvider>
        <AppGroupLayout>
          <p>page content</p>
        </AppGroupLayout>
      </StoreProvider>,
    );

    expect(screen.getByText('page content')).toBeDefined();

    const brandLink = screen.getByRole('link', { name: 'Platform' });
    expect(brandLink.getAttribute('href')).toBe('/');

    const menuLink = screen.getByRole('link', { name: 'Menu' });
    expect(menuLink.getAttribute('href')).toBe('/menu');
  });
});
