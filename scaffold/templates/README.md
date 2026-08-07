# scaffold/templates/

Skeletons copied when adding a service or a module — so the correct shape gets
written once, by hand, and every use after that is copy-and-rename instead of
copy-and-hope.

**This exists specifically because of a bug.** `backend/core` was hand-copied
from `backend/auth` early in this workspace's life, and `migrationsTableName`
only got set in two of the three places it needs to agree (`data-source.ts`,
`app.module.ts` — `src/test/db.ts` was missed). It surfaced as a failing
integration test, not a review comment, because nothing forced the third file
to be touched. A template with the placeholder already in all three files
removes the chance to forget one.

## What's here

| Folder | For | Placeholder tokens |
|---|---|---|
| `backend-service/` | A new deployable NestJS service under `platform/backend/<name>/` | `__SERVICE_NAME__`, `__PORT__` |
| `backend-module/` | A new feature module inside an existing service's `src/modules/` | `__module_name__` |
| `frontend-module/` | A new feature module inside `frontend/web/src/modules/` | `__feature_name__` |

## How to use one

1. Copy the folder to its real location and rename it (e.g. `backend-service/`
   → `platform/backend/orders/`).
2. Find-and-replace every placeholder token, consistently, across every file.
   `__SERVICE_NAME__` and `__module_name__`/`__feature_name__` are
   deliberately different casing so a find-and-replace on one can't
   accidentally match the other.
3. Follow the template's own `README.md` for what's still manual — port
   assignment, the workspace glob (usually nothing to do, `backend/*` and the
   equivalent frontend/module globs already cover new folders), and
   registering the module in its parent's `app.module.ts` or route tree.
4. Run the four gates before writing any real logic — an unmodified,
   correctly-renamed template should pass `build`/`typecheck`/`lint`/`test`
   with zero changes. If it doesn't, the template is wrong, not your code.

## Keeping these current

These are hand-maintained copies of `backend/auth`'s actual, gate-verified
shape — not generated. When a pattern in the real services changes (a new
required config field, a different health-check convention), update the
template in the same change, or it silently goes stale the way `agent-policies.md`
did when B7/R6/X5 changed without it. There's no CI check tying the template to
the real service yet — this is a discipline, not an enforced rule.
