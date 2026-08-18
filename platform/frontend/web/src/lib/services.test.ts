// @vitest-environment node
//
// This file never touches the DOM, and needs a real Node global environment:
// esbuild's `transformSync` asserts `new TextEncoder().encode('') instanceof
// Uint8Array` on load, which is false under jsdom (jsdom's `TextEncoder`
// returns a `Uint8Array` from a different realm than esbuild's own `instanceof`
// check expects), so the project-wide `environment: 'jsdom'` default
// (vitest.config.mts) has to be overridden per-file here.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';

// Regression test for a real bug found live during T07 verification (see
// scaffold/memory/DECISIONS.md, "T07 (regression)"): `required()` in
// services.ts originally read the env var via `process.env[name]` — a
// *computed* (bracket) member access. Next.js only inlines `NEXT_PUBLIC_*`
// vars into the client bundle for *static* `process.env.X` reads: the
// bundler performs a literal, AST-level substitution of that exact dotted
// identifier expression at build time. There is no real `process.env`
// object shipped to the browser, so a computed read like `process.env[name]`
// doesn't match that static pattern and silently resolves to `undefined` at
// runtime in the browser — even though the same code reads the correct
// value under Node/SSR/tests, where `process.env` genuinely is a live
// object and both forms work identically. That's exactly why the bug shipped
// past every prior jsdom-based test in this suite (T06/T07) undetected:
// jsdom's `process.env` is real, so this class of bug is invisible to a
// jsdom-level unit or component test no matter what it asserts on.
//
// This test instead runs the *actual* services.ts source text through
// esbuild's `transform` step with a `define` for
// NEXT_PUBLIC_AUTH_SERVICE_URL — the same class of static
// define/member-expression substitution mechanism Next.js's own bundler
// (webpack/Turbopack) performs for NEXT_PUBLIC_* inlining — and asserts the
// configured URL literal actually appears in the compiled output. That only
// happens if the source reads the var via a static `process.env.X`
// expression; reverting to `process.env[name]` makes esbuild's `define`
// silently no-op (verified below with a second, minimal case), so the
// configured URL would no longer appear in the output and this test would
// fail.
describe('services.ts NEXT_PUBLIC_* env vars survive build-time inlining', () => {
  it('inlines the static process.env.NEXT_PUBLIC_AUTH_SERVICE_URL read in the real services.ts source into its literal value', () => {
    const servicesPath = path.resolve(process.cwd(), 'src/lib/services.ts');
    const source = readFileSync(servicesPath, 'utf8');
    const configuredUrl = 'http://localhost:4001';

    const result = transformSync(source, {
      loader: 'ts',
      define: {
        'process.env.NEXT_PUBLIC_AUTH_SERVICE_URL': JSON.stringify(configuredUrl),
      },
    });

    // Only true if the real file reads the var via a static
    // `process.env.NEXT_PUBLIC_AUTH_SERVICE_URL` expression somewhere in the
    // `authService` factory. A reversion to `process.env[name]` (computed
    // access) leaves that identifier expression un-replaced and this
    // assertion fails.
    expect(result.code).toContain(configuredUrl);
  });

  // cafe-menu-management T08 — cafeService() is the first café-service
  // caller in services.ts, written against the same static
  // `process.env.NEXT_PUBLIC_CAFE_SERVICE_URL` pattern as authService above
  // specifically to not reintroduce the process.env[name] bug this file
  // documents. Same mechanism, new call site — proven independently rather
  // than assumed to inherit the first test's coverage for free.
  it('inlines the static process.env.NEXT_PUBLIC_CAFE_SERVICE_URL read in the real services.ts source into its literal value (cafeService)', () => {
    const servicesPath = path.resolve(process.cwd(), 'src/lib/services.ts');
    const source = readFileSync(servicesPath, 'utf8');
    const configuredUrl = 'http://localhost:4003';

    const result = transformSync(source, {
      loader: 'ts',
      define: {
        'process.env.NEXT_PUBLIC_CAFE_SERVICE_URL': JSON.stringify(configuredUrl),
      },
    });

    expect(result.code).toContain(configuredUrl);
  });

  it('demonstrates the failure mode directly: a computed process.env[name] read is not inlined by the same define mechanism', () => {
    const dynamicSource = "export const readIt = (name) => process.env[name];";
    const configuredUrl = 'http://localhost:4001';

    const result = transformSync(dynamicSource, {
      loader: 'ts',
      define: {
        'process.env.NEXT_PUBLIC_AUTH_SERVICE_URL': JSON.stringify(configuredUrl),
      },
    });

    // Confirms the assumption the first test relies on: esbuild's `define`
    // (like webpack's/Turbopack's env inlining) only rewrites a static,
    // literal member-expression path — never a computed one — so this stays
    // the original bracket-access source, not the inlined URL.
    expect(result.code).not.toContain(configuredUrl);
    expect(result.code).toContain('process.env[name]');
  });
});
