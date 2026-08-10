# Demo build plan — login + café menu management

Feed this file back after rolling back, to resume without re-deriving scope.
Written 2026-08-08, against `platform/` at tag `pre-demo-build`.

**Standing instruction for whoever builds from this file: skip the reviewer
step for both modules below. Implement directly, run gates
(`build`/`typecheck`/`lint`/`test`) after each module, no BLOCKER/rework
loop.** This is demo-only scope — do not treat it as the real PRD build.

## 0. Rollback (run first, in this order)

```bash
cd platform && git reset --hard pre-demo-build
cd .. && git reset --hard pre-demo-build
```

Both repos were clean and tagged before the first login demo pass, so this
returns `platform/` to the state right after the BFF-removal/shared-DB work,
with none of the demo code. Postgres migrations already run against the dev
DB (the `users` table + demo row) are **not** undone by this — check
`backend/auth/src/db/migrations/` after rollback; if the demo migration file
is gone but the table still exists in Postgres, drop it manually before
re-running `migration:run` to avoid a duplicate-table error.

## 1. Login — rebuild

**Screens (per `docs/wireframes/login/`):** `login-default.png`,
`login-loading.png` only. **No `login-error.png`** — no error-state UI.

**ACs in scope:** AC1 (valid login → `/dashboard`), AC3 (loading: button +
both inputs disabled, no double submit), AC6 (already-authenticated visiting
`/login` redirects to `/dashboard` without rendering the form), AC7 (password
masked by default, eye-icon toggle reveals/re-masks, keyboard-reachable,
announces state to screen readers), AC9 (email holds focus on load; tab order
email → password → toggle → forgot-password link → submit), AC11 ("Forgot
password?" navigates to `/forgot-password`, which only needs to exist as a
stub page — its own flow is out of scope).

**Explicitly out:** AC2, AC4, AC5, AC8 (all error-state UI — invalid
credentials, empty/invalid email, 5xx), AC10 (session persistence — not
tested/built beyond what `localStorage` already gives for free).

**Backend:** reuse `backend/auth`'s existing shape — `POST /auth/login`,
`users` table, bcrypt + JWT. Demo seed user: `demo@example.com` /
`Demo1234!`. No changes needed beyond what the previous pass already had;
just re-apply after rollback.

**Frontend additions vs. the first pass:** logo placeholder, "Sign in" title
+ "Use your work email to continue" subtitle, footer text ("Need an account?
Contact your administrator"), password visibility toggle, "Forgot password?"
link + stub `/forgot-password` page, redirect-if-already-authenticated check
on mount, both inputs (not just the button) going read-only while loading.

**No reviewer. No error-state fidelity — happy path + loading + AC6/7/9/11 only.**

## 2. Café — menu management (add item only)

**Screens (per `docs/wireframes/cafe-menu-management/`):** loosely based on
`cafe-menu-add-default.png` for the form; **no error-state screen**, and no
`cafe-menu-list-default.png` fidelity — the "list" here is a simple list of
added items, not the wireframed admin list (no Unavailable badge, no
edit/reorder).

**ACs in scope (partial):** AC1 (name, category, price required to save),
AC5 (every item belongs to exactly one category — category is a hardcoded
dropdown, not its own entity).

**Explicitly out:** AC2 error UI (backend still rejects price ≤ 0, but no
inline error message shown), AC3/AC4 (availability toggle), AC6 (category
reorder — moot since categories are hardcoded, not managed), VC-004 (role
guard — dropped entirely, see below).

**No role check.** Any logged-in user (the same `demo@example.com` session
from login) can add items — `cafe-access-roles` is not built, not stubbed,
not referenced.

**Backend:** new `backend/cafe/` service, scaffolded from
`scaffold/templates/backend-service/`. One table, `menu_items` (id, name,
price, category [text, not a FK], is_available default true, created_at).
No `menu_categories` table. Two endpoints: `POST /menu/items`,
`GET /menu/items`. Needs its own port (next free: 4003), its own
`CORS_ORIGIN`, its own `migrationsTableName: 'cafe_migrations'`, and a
`NEXT_PUBLIC_CAFE_SERVICE_URL` + `cafeService()` client added to
`frontend/web/src/lib/services.ts`.

**Frontend:** one page (e.g. `/menu`) with the add-item form (happy path
only — name, category dropdown, price) and a simple list of items added
this session, rendered below the form. Reachable from the app nav.

**No reviewer. No error-state UI. No category/availability management.**

## 3. Order and estimate

1. Login rebuild — 30-45 min
2. Café menu management (add item, hardcoded categories, no roles, no
   error UI) — 30-45 min

**Total: ~1-1.5 hours.**

Gates (`build`/`typecheck`/`lint`/`test`) run after each module, since the
reviewer step is being skipped — gates are the only check left. Not run:
`test:int` (not relevant to either module's scope).

---

**STATUS: superseded.** The session moved to building the full-scope PRDs
(all ACs, full 7-policy reviewer, via `/plan`/`/build`) instead of this
trimmed path — see `scaffold/memory/STATE.md`/session history for the
current plan. Kept here as a historical record of the trimmed-scope option,
not something to build from as-is.
