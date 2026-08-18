import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import cafeLintRules from './backend/cafe/src/common/lint-rules/require-role-policy.cjs';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // cafe-access-roles AC5 / VC-004 — every HTTP-decorated controller method
    // in backend/cafe must declare @RequireRoles(...) or @Public(), enforced
    // at build time via `pnpm lint`. See
    // backend/cafe/src/common/lint-rules/require-role-policy.cjs for the rule
    // itself and backend/cafe/src/common/lint-rules/require-role-policy.spec.ts
    // for its own test suite (both directions).
    files: ['backend/cafe/src/modules/**/*.controller.ts'],
    plugins: { cafe: cafeLintRules },
    rules: {
      'cafe/require-role-policy': 'error',
    },
  },
  {
    // CommonJS files — `module.exports`, no ESM. Matched by glob rather than
    // by name so adding e.g. jest.int.config.js (or another `.cjs` module,
    // like the require-role-policy lint rule above) doesn't break lint.
    files: ['**/*.config.js', '**/*.cjs'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/node_modules/**', '**/next-env.d.ts'],
  },
);
