import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `@/*` mirrors tsconfig's own `paths` entry (`{"@/*": ["./src/*"]}`), which
// Next.js resolves natively at build time but Vite/Vitest does not pick up
// from tsconfig automatically — first import to actually cross that alias
// under a test was T07's `@/lib/services` / `@/lib/session-storage`.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.{ts,tsx}'] },
});
