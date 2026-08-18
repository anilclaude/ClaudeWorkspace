import { Linter, type Linter as LinterType, type ESLint } from 'eslint';
// Both required rather than imported: `@typescript-eslint/parser` ships
// package.json `exports` conditions this project's `moduleResolution: Node`
// (classic) can't follow via `import`, and `require-role-policy.cjs` is a
// plain CommonJS module with no `.d.ts` of its own — `require()` sidesteps
// both without changing the service's module resolution setting.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsParser: LinterType.Parser = require('@typescript-eslint/parser');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cafeLintRules: ESLint.Plugin = require('./require-role-policy.cjs');

// Proves T03's build-time check (AC5 / VC-004) actually works, in both
// directions — a check that only proves the positive case would pass review
// while being unable to catch a missing decorator, the exact failure VC-004
// exists to prevent. All fixtures below are inline source strings inside
// this test-only file: they are never written to disk as a real
// `*.controller.ts`, so they can never be picked up by the real
// `backend/cafe/src/modules/**/*.controller.ts` glob the rule is scoped to
// in the root eslint.config.mjs, and can never accidentally ship as an
// unguarded production controller.

const config: LinterType.Config[] = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
    plugins: { cafe: cafeLintRules },
    rules: { 'cafe/require-role-policy': 'error' },
  },
];

function lint(code: string): LinterType.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(code, config, 'fixture.controller.ts');
}

describe('require-role-policy (AC5 / VC-004 build-time check)', () => {
  // Positive case: a method-level @RequireRoles(...) satisfies the check.
  it('passes a method decorated with @RequireRoles(...)', () => {
    const code = `
      import { Controller, Get } from '@nestjs/common';
      import { RequireRoles } from '../../common/guards';

      @Controller('widgets')
      class WidgetsController {
        @Get()
        @RequireRoles('Admin')
        list() {}
      }
    `;

    expect(lint(code)).toHaveLength(0);
  });

  // Positive case: a method-level @Public() also satisfies the check.
  it('passes a method decorated with @Public()', () => {
    const code = `
      import { Controller, Get } from '@nestjs/common';
      import { Public } from '../../common/guards';

      @Controller('widgets')
      class WidgetsController {
        @Get()
        @Public()
        ping() {}
      }
    `;

    expect(lint(code)).toHaveLength(0);
  });

  // Positive case: a method with no decorator of its own falls back to a
  // class-level policy — mirrors roles.guard.ts's own fallback precedence.
  it('passes a method with no decorator when the class itself declares a policy', () => {
    const code = `
      import { Controller, Get } from '@nestjs/common';
      import { Public } from '../../common/guards';

      @Public()
      @Controller('widgets')
      class WidgetsController {
        @Get()
        list() {}
      }
    `;

    expect(lint(code)).toHaveLength(0);
  });

  // Negative case — the hard requirement: a deliberately undecorated
  // HTTP-handling method, with no class-level fallback either, must fail.
  // This is the exact scenario VC-004 exists to catch: an endpoint that
  // ships with no role policy declared.
  it('fails a deliberately undecorated method with no class-level fallback', () => {
    const code = `
      import { Controller, Get } from '@nestjs/common';

      @Controller('widgets')
      class WidgetsController {
        @Get()
        list() {}
      }
    `;

    const messages = lint(code);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.ruleId).toBe('cafe/require-role-policy');
    expect(messages[0]?.messageId).toBe('missingPolicy');
    expect(messages[0]?.message).toContain("'list'");
  });

  // Negative case, variant: one guarded method plus one deliberately
  // undecorated sibling method on the same class — proves the check flags
  // the specific offending method, not just "something in this file is
  // wrong" or "the whole class is fine because one method is declared".
  it('fails only the undecorated sibling method, not the correctly-decorated one', () => {
    const code = `
      import { Controller, Get } from '@nestjs/common';
      import { RequireRoles } from '../../common/guards';

      @Controller('widgets')
      class WidgetsController {
        @Get()
        @RequireRoles('Admin')
        list() {}

        @Get('legacy')
        legacy() {}
      }
    `;

    const messages = lint(code);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain("'legacy'");
  });

  // A non-HTTP-decorated method (no @Get/@Post/etc.) is not an endpoint and
  // is correctly ignored by the check, decorated or not.
  it('ignores a method with no HTTP decorator at all', () => {
    const code = `
      import { Controller } from '@nestjs/common';

      @Controller('widgets')
      class WidgetsController {
        private helper() {
          return 1;
        }
      }
    `;

    expect(lint(code)).toHaveLength(0);
  });

  // Forward NIT from T02 review cycle 2: @Public() and @RequireRoles(...)
  // stacked on the SAME method is a visually obvious authoring contradiction
  // — at runtime @Public() silently wins (roles.guard.ts), so this must be
  // flagged as an error too, not silently accepted as "declared".
  it('fails a method carrying both @Public() and @RequireRoles(...) at once', () => {
    const code = `
      import { Controller, Get } from '@nestjs/common';
      import { RequireRoles, Public } from '../../common/guards';

      @Controller('widgets')
      class WidgetsController {
        @Get()
        @RequireRoles('Admin')
        @Public()
        list() {}
      }
    `;

    const messages = lint(code);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.messageId).toBe('conflictingPolicy');
  });
});
