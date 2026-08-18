import { describe, it, expect } from 'vitest';
import reducer, { toggleSidebar, setSidebarOpen, type UiState } from './ui.slice';

describe('ui slice', () => {
  const initial: UiState = { sidebarOpen: false };

  it('starts closed', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('toggles the sidebar', () => {
    const opened = reducer(initial, toggleSidebar());
    expect(opened.sidebarOpen).toBe(true);
    expect(reducer(opened, toggleSidebar()).sidebarOpen).toBe(false);
  });

  it('sets the sidebar explicitly', () => {
    expect(reducer(initial, setSidebarOpen(true)).sidebarOpen).toBe(true);
    expect(reducer({ sidebarOpen: true }, setSidebarOpen(false)).sidebarOpen).toBe(false);
  });
});
