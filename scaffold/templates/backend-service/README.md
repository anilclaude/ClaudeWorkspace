# backend-service template

Copy to `platform/backend/<name>/`, then replace every `__SERVICE_NAME__` and
`__PORT__` — case-sensitive, consistent across all files.

## Checklist after copying

- [ ] `__SERVICE_NAME__` → your service name, lowercase, matching the folder
      (e.g. `orders`) — used in `package.json`'s name, `migrationsTableName`
      (×3 files, see below), and the boot log line in `main.ts`
- [ ] `__PORT__` → the next free port (`4000` + n) — `repo-structure.md`'s
      port scheme
- [ ] `migrationsTableName: '__SERVICE_NAME___migrations'` is set in **three**
      files and all three must say the same thing:
      `src/db/data-source.ts`, `src/app.module.ts`, `src/test/db.ts`.
      This is the exact bug this template exists to prevent — missing it in
      even one of the three silently shares the default `migrations` table
      with another service. Grep for `__SERVICE_NAME___migrations` after
      replacing to confirm all three landed.
- [ ] `.env` and `.env.test` copied from `.env.example`/`.env.test` (not
      committed) with `POSTGRES_DB` left as `platform_db` /
      `platform_test_db` — every service shares the one database, this isn't
      a per-service value
- [ ] Registered in the root `pnpm-workspace.yaml` — usually nothing to do,
      `backend/*` already globs it
- [ ] `shared/contracts/src/__SERVICE_NAME__/` created for anything this
      service publishes (X6 — contracts before implementation)
- [ ] `<name>` added to `infrastructure/docker/postgres-init/init-databases.sh`
      — **no**, actually don't: every service shares `platform_db`, there is
      no new database to create. Left here as an explicit non-step because
      it's the instinctive thing to reach for and it's wrong now.

## What you get

A booting NestJS service with fail-fast Zod env validation, a split
liveness/readiness `/health` endpoint (matching `@app/contracts`'
`healthLiveSchema`), TypeORM wired with migrations (never `synchronize`), and
a working integration-test harness scoped correctly to this service's own
tables. Nothing else — no real feature module. Add one from
`../backend-module/`.

## Verifying it

```bash
pnpm install
pnpm --filter @app/__SERVICE_NAME__-service build
pnpm --filter @app/__SERVICE_NAME__-service typecheck
pnpm --filter @app/__SERVICE_NAME__-service lint
pnpm --filter @app/__SERVICE_NAME__-service test
pnpm --filter @app/__SERVICE_NAME__-service migration:run   # needs pnpm db:up
pnpm --filter @app/__SERVICE_NAME__-service test:int        # needs pnpm db:up
```

All should pass with zero source changes beyond the placeholder replacement.
