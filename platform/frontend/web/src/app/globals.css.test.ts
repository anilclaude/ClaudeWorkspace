import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

// Regression test for the reviewer SHOULD-FIX on T05 cycle 1 (see
// scaffold/memory/DECISIONS.md, "T05 (scaffold bug)"): globals.css had no
// `@source` directive pointing at @app/ui, a separate workspace package
// pulled in via next.config.js's transpilePackages rather than copied into
// frontend/web/src. Tailwind v4 only auto-detects content inside the CSS
// file's own directory tree, so every utility class used only inside a
// shared component (Button, Field, Card, Badge) was silently missing from
// the compiled CSS and those components rendered fully unstyled.
//
// jsdom (this project's Vitest environment) does not compile Tailwind, so a
// component-render test cannot catch this class of bug - the DOM has the
// right class names either way, only the *compiled CSS* differs. This test
// instead runs the real PostCSS + @tailwindcss/postcss pipeline against the
// actual globals.css file and inspects the generated CSS text. Deliberately
// not a full `next build`: that would exercise the same @source resolution
// but cost far more time on every test run for no extra signal, since the
// bug lives entirely in Tailwind's source-scanning step, not anywhere else
// in the Next build pipeline.
//
// IMPORTANT: the target utility class is assembled at runtime (see
// `targetClass` below) and must never appear as a literal contiguous token
// anywhere in this file, including comments. This file lives under
// frontend/web/src, which is itself inside Tailwind's auto-detected content
// area (that's the part that already works without @source - see the
// comment in globals.css). Tailwind's scanner is a plain text scanner, not
// JS-aware: a literal occurrence of the class name in this file's source
// text would make Tailwind "see" it as used and generate it regardless of
// whether @source is present, silently turning this into a test that can
// never fail. This was caught empirically while writing this test: with
// the class name spelled out literally in a comment here, the assertion
// still passed even after temporarily deleting the @source line from
// globals.css.
describe('globals.css Tailwind @source coverage', () => {
  it("compiles the class only @app/ui's Button variant styling defines, nowhere in frontend/web/src, into globals.css's compiled output", async () => {
    // @app/ui's primary Button variant (frontend/libs/ui/src/components/button.tsx)
    // is the only place this class is used anywhere in the workspace.
    const targetClass = ['bg', 'slate', '800'].join('-');

    // vitest.config.mts sets no custom `root`, so cwd is this package's root
    // (frontend/web) regardless of which directory the test runner is
    // invoked from.
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const css = readFileSync(cssPath, 'utf8');

    const result = await postcss([tailwindcss()]).process(css, { from: cssPath });

    expect(result.css).toContain(targetClass);
  });
});
