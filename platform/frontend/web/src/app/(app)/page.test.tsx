import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

// Scaffold smoke test — makes `pnpm test` a real gate rather than a no-op that
// reports success with zero test files.
describe('scaffold', () => {
  it('renders the placeholder page', () => {
    render(<Home />);
    expect(screen.getByText(/scaffold ready/i)).toBeDefined();
  });
});
