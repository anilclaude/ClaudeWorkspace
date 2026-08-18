# frontend/mobile

**Reserved. No app here yet.**

This folder exists so the segregation is visible in the tree — `frontend/web`
and `frontend/mobile` are siblings, and the shared layer between them is
`frontend/libs/core`.

## Before adding a mobile app

1. **Add the mobile stack to `scaffold/inputs/tech-stack.md` first** — React
   Native or Expo, navigation, and the test runner, with pinned versions.
   Builder policy B6 forbids introducing a library that isn't in that file, so
   scaffolding an app before the stack is declared would violate the scaffold's
   own rules.
2. Add its port (or Expo config) to `scaffold/inputs/repo-structure.md`.
3. Scaffold it here as `@app/mobile`, consuming `@app/frontend-core` and
   `@app/contracts` — never `@app/ui`, which is web-only (Tailwind and DOM).

## What mobile may and may not import

| Package | Mobile can use it | Why |
|---|---|---|
| `@app/contracts` | yes | Platform-agnostic Zod schemas |
| `@app/common` | yes | Framework-agnostic utilities |
| `@app/frontend-core` | yes | API client, slices, hooks — no renderer |
| `@app/ui` | **no** | Web-only: Tailwind classes and DOM elements |
| `@app/ui-native` | (future) | Where React Native components would go |

The reason `frontend/libs/core` exists at all is so that adding mobile does
not mean reimplementing the API client, the store, and the validation logic.
