# platform/

The product. Backend services, frontend apps, shared libraries, infrastructure.

The process that builds it lives in [`../scaffold/`](../scaffold/README.md) —
this README covers running the code, not the build loop.

## First run

```bash
# 1. from the repo root
corepack enable
cd platform
pnpm install

# 2. env files — every app needs one, none are committed
cp .env.example .env
cp backend/auth/.env.example backend/auth/.env
cp backend/core/.env.example backend/core/.env
cp frontend/web/.env.example frontend/web/.env

# 3. start Postgres (creates the shared platform_db + platform_test_db on first boot)
pnpm db:up

# 4. run migrations for each service (see Migrations below)
pnpm --filter @app/auth-service migration:run
pnpm --filter @app/core-service migration:run

# 5. verify everything is green before writing any feature code
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

Step 5 is not optional. If those four don't pass on an untouched checkout, the
reviewer has nothing to enforce and "tests pass" stops meaning anything — see
prerequisite D in `docs/BaseWorkspace_Structure_Lite`.

## Running

```bash
pnpm dev                              # everything, in parallel
pnpm --filter @app/web dev            # just the web app      :3001
pnpm --filter @app/auth-service dev   # just the auth service :4001
pnpm --filter @app/core-service dev   # just the core service :4002
```

| App | Port |
|---|---|
| `frontend/web` | 3001 |
| `backend/auth` | 4001 |
| `backend/core` | 4002 |

Every backend service connects to the same database and schema — `platform_db`
— not one database each. See "Database" below for what that does and doesn't
mean.

Postgres runs on **5433**, not 5432 — many machines already have a native
Postgres on 5432, and it wins for `localhost` connections, so every service
would silently talk to the wrong database.

Health: `GET /health/live` (process up, no DB) and `GET /health` (up **and** DB
reachable). `/health` fails until `pnpm db:up` has run — that's correct, not a bug.

## Database

One Postgres instance, one database (`platform_db`), one schema, shared by
every backend service. Not one database per service.

That means service data privacy is **a code-review rule, not an infrastructure
guarantee** — nothing physically stops `backend/core` from querying a table
`backend/auth` owns. It still must not: cross-service data goes over HTTP
through a contract in `shared/contracts`, and the reviewer treats a direct
cross-service entity/repository import as a BLOCKER (R7).

Two things stay isolated per service even though the database doesn't:

- **Migration history** — each service sets its own `migrationsTableName`
  (`auth_migrations`, `core_migrations`, …) in `data-source.ts`, `app.module.ts`,
  **and** `src/test/db.ts` if it has an integration harness. All three must
  agree — a mismatch in just one silently points that connection at the shared
  default `migrations` table, which is exactly the collision this exists to
  prevent.
- **Integration-test truncation** — scoped to `dataSource.entityMetadatas`
  (the tables *this service's own* entity glob declares), never a broad sweep
  of the schema. See Integration tests below.

## Gates

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test   # no Docker needed
pnpm test:int                                            # needs pnpm db:up
```

All five must pass before `/commit` will run. Turborepo builds `shared/*`,
`backend/libs/*`, and `frontend/libs/*` before the apps that consume them.

`test` is unit-only and deliberately Docker-free so the inner loop stays fast.
`test:int` is separate and needs a running database.

## Integration tests

Files named `*.int-spec.ts`, run by `jest.int.config.js`, against a **separate
test database** (`platform_test_db`) — never the dev database, because the
harness truncates between cases. That truncation is scoped to the tables the
running service's own entities declare (`dataSource.entityMetadatas`), never a
blanket sweep of the schema — the database is shared, so a blanket sweep would
also wipe every other service's tables mid test run.

```bash
pnpm --filter @app/auth-service test:int
```

Two guards, both verified:

- Pointing at a database whose name doesn't end in `_test_db` is **refused**,
  so a stray `POSTGRES_DB` can't wipe your dev data.
- An unreachable database **fails loudly** with instructions — integration
  tests are never silently skipped, because a skipped DB test that reports
  success is worse than no test.

Env precedence is real environment (CI) → `.env.test` → `.env`.

Writing one:

```ts
import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from './test/db';

beforeAll(async () => { await initTestDb(); });
beforeEach(async () => { await truncateAll(); });   // don't skip this
afterAll(async () => { await closeTestDb(); });     // or Jest won't exit
```

`src/test/db.ts` is service-local for now. When a second service needs it,
promote it to `backend/libs/testing` rather than copying it.

## Migrations

`synchronize` is `false` everywhere — the ORM never changes schema on boot. A
schema change is a reviewed, reversible migration.

```bash
# after adding or changing an entity, generate the migration
pnpm --filter @app/auth-service migration:generate src/db/migrations/AddUser

pnpm --filter @app/auth-service migration:run
pnpm --filter @app/auth-service migration:revert
```

Every service shares one database — see Database above for what stays isolated
(migration history, test truncation) and what doesn't (the schema itself). No
service reads another's tables regardless: cross-service data goes over HTTP
through a contract in `shared/contracts`, enforced at review time (R7), not by
the database.

## Where things go

| Putting | Goes in |
|---|---|
| A feature inside a service | `backend/<service>/src/modules/<module>/` |
| A feature inside the web app | `frontend/web/src/modules/<feature>/` |
| A route | `frontend/web/src/app/` — routing only, no logic |
| A call to a service from the browser | `src/lib/services.ts` — `authService()`/`coreService()`, direct, no BFF |
| A type crossing any boundary | `shared/contracts/` **first**, then implement against it |
| Something two services share | `backend/libs/` |
| Something two frontend apps share | `frontend/libs/` |
| Something both sides share | `shared/` |

Only `*.service.ts` touches the database. Controllers and routing files don't.

Full rules: [`../scaffold/inputs/repo-structure.md`](../scaffold/inputs/repo-structure.md).

## Adding a service

1. `backend/<name>/`, following `auth`'s shape
2. Next free port (`4000` + n)
3. Set `migrationsTableName: '<name>_migrations'` in that service's
   `data-source.ts`, `app.module.ts`, and `src/test/db.ts` (if it gets an
   integration harness) — all three, or it silently shares the default
   `migrations` table with whatever service forgot to set theirs too
4. `shared/contracts/src/<name>/` for anything it publishes
5. No workspace-glob change needed — `backend/*` already covers it. No new
   database, either — it uses `platform_db` like everything else.
