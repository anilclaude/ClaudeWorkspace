# Tech stack

Single source of truth. A PRD never overrides this file.

Versions below are **installed and verified** — all four gate commands pass on
this scaffold. The `Installed` column is what actually resolved; the `Range`
column is what `package.json` pins.

Stack profile: **right-sized services** — NestJS services sharing one database
and schema + a Next.js web app calling them directly (CORS-enabled, no BFF
layer), custom JWT auth. Shape declared in `repo-structure.md`.

## Runtime

| Layer | Choice | Range | Installed |
|---|---|---|---|
| Language | TypeScript | `^6.0.3` | 6.0.3 |
| Runtime | Node.js | `>=24.0.0` | 24.18.0 |
| Package manager | pnpm (workspaces) | `9.15.0` | 9.15.0 |

## Frontend — `frontend/web/`, port 3001

| Layer | Choice | Range | Installed |
|---|---|---|---|
| Framework | Next.js (App Router, no BFF layer) | `^16.2.10` | 16.3.0 |
| Library | React | `^19.2.7` | 19.2.8 |
| Styling | Tailwind CSS (CSS-native config) | `^4.3.3` | 4.3.3 |
| PostCSS bridge | `@tailwindcss/postcss` | `^4.3.3` | 4.3.3 |
| State | Redux Toolkit | `^2.12.0` | 2.12.0 |
| React bindings | react-redux | `^9.3.0` | 9.3.0 |
| HTTP client | native `fetch`, via `@app/frontend-core`'s `createApiClient` | — | — |
| Icons | lucide-react | `^1.25.0` | 1.28.0 |

The browser calls each backend service directly, using `NEXT_PUBLIC_*` service
URLs and contract-validated clients from `@app/frontend-core`. CORS on each
service (`CORS_ORIGIN`) is what makes this work — see `repo-structure.md`.

## Backend services — `backend/auth/` :4001 · `backend/core/` :4002

| Layer | Choice | Range | Installed |
|---|---|---|---|
| Framework | NestJS | `^11.1.28` | 11.1.28 |
| ORM | TypeORM + `pg` | `^1.1.0` / `^8.22.0` | 1.1.0 / 8.22.0 |
| Database | PostgreSQL | 18 (docker) | — |
| Validation | Zod — parsed once at boot, fail-fast | `^4.4.3` | 4.4.3 |
| Auth | Custom JWT (`jsonwebtoken`) | `^9.0.3` | 9.0.3 |
| Password hashing | bcrypt | `^6.0.0` | 6.0.0 |
| Health checks | `@nestjs/terminus` | `^11.1.1` | 11.1.1 |

Migrations only — `synchronize` is `false`. A schema change is a reviewed,
reversible migration, never something the ORM does on boot.

Health is split: `GET /health/live` (process up, no DB) and `GET /health`
(process up **and** DB reachable). An orchestrator restarting the container
because Postgres blipped is worse than leaving it running.

## Quality

| Layer | Choice | Range | Installed |
|---|---|---|---|
| Frontend tests | Vitest + Testing Library + jsdom | `^4.1.10` | 4.1.10 |
| Backend tests | Jest + ts-jest | `^30.4.2` | 30.4.2 |
| Linter | ESLint 9 flat config + typescript-eslint | `^9.39.5` | 9.39.5 |
| Formatter | Prettier | `^3.9.5` | 3.9.6 |

## Gate commands

**Verified green on the empty scaffold** — prerequisite D is satisfied.

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

| Gate | Command | Status |
|---|---|---|
| build | `pnpm build` | PASS — 6 tsup/nest/next builds, packages first |
| typecheck | `pnpm typecheck` | PASS — 8 packages, `tsc --noEmit` |
| lint | `pnpm lint` | PASS — zero errors, zero warnings |
| test | `pnpm test` | PASS — 11 tests across 6 packages |

Every package carries at least one test so `test` is a real gate rather
than a no-op reporting success with zero test files. None requires a running
database — the service health specs mock their dependencies.

## Decisions

Anything chosen mid-build under ambiguity gets promoted here.

| Date | Decision | Why |
|---|---|---|
| 2026-08-06 | `rootDir: "./src"` explicit in every service `tsconfig.json` | TypeScript 6 errors (TS5011) when `outDir` is set without it. Caught by the build gate on the empty scaffold. |
| 2026-08-06 | `eslint.config.mjs`, not `.js` | `platform/package.json` has no `"type": "module"`; the `.js` extension made Node reparse the ESM config on every lint run and warn. |
| 2026-08-06 | `vitest.config.mts`, not `.ts` | Same cause, Vite side. Avoids the `configLoader: 'native'` deprecation warning. |
| 2026-08-06 | Turborepo, not plain `pnpm -r` | `packages/*` are tsup-compiled and must build before the services and web app that consume them. That ordering needs `dependsOn: ["^build"]`. |
| 2026-08-06 | `@types/node` + `types: ["node"]` in `packages/common` | `setTimeout` in the backoff helper needs Node typings; without the dependency present the tsup dts build fails with TS2304. |
| 2026-08-06 | `testRegex` via `/.../.source` in service Jest configs | A string literal needs doubled backslashes that are easy to lose in generation; the regex-literal form cannot be silently corrupted and ESLint's `no-useless-escape` catches it if it is. |
| 2026-08-06 | `packages/contracts` from day one | Reverses CF-Monorepo's "no shared DTOs" rule. That rule holds only while each app talks solely to its own backend — with services calling each other, duplicated types drift silently and surface in production. |
| 2026-08-06 | Retries on idempotent methods only, in the frontend service client | Retrying a POST could double-submit and defeat the in-flight guard the login PRD requires (AC3). |
| 2026-08-06 | Rate limiting deferred | Product decision recorded in the login PRD §5, not a stack gap. No throttling library is installed. |
| 2026-08-06 | No message broker | Two services, synchronous HTTP. Easier to debug and sufficient at this size; revisit when a genuine async workflow appears. |
| 2026-08-07 | `packages/` split into `shared/`, `backend/`, `frontend/` | Flat `packages/` gave no signal about who may import what. The split makes a frontend package importing Nest, or a shared package importing React, visible in the path. |
| 2026-08-07 | `@app/frontend-core` added | Platform-agnostic frontend logic — API client, slices, hooks — so adding `frontend/mobile` does not mean reimplementing them. Nothing in it may touch a renderer. |
| 2026-08-07 | `zod` a direct dependency of `@app/frontend-core` | It was only transitive via `@app/contracts`; pnpm's strict linking made it unresolvable and the dts build failed TS2307. |
| 2026-08-07 | `frontend/*` listed explicitly, not globbed | `frontend/mobile` holds only a README until a mobile stack is declared; a glob would make pnpm treat the empty folder as a broken package. |
| 2026-08-07 | `packages/{backend,frontend}` merged into `backend/libs/`, `frontend/libs/`; `packages/shared` flattened to `shared/` | One session after the shared/backend/frontend split, moved libraries beside the side that consumes them so "everything backend-related is under `backend/`" holds literally. `shared/` stays outside both since it's the one thing genuinely importable by either. |
| 2026-08-07 | One shared database and schema (`platform_db`) for every backend service, replacing one database per service | Deliberate simplification for this project's scale — one Postgres connection to manage instead of N. Service data privacy (CLAUDE.md #5, X5) moved from an infrastructure guarantee to a review-time one: R7 now BLOCKERs a direct cross-service entity/repository import. Each service keeps its own migration history isolated via a namespaced `migrationsTableName`, set identically in `data-source.ts`, `app.module.ts`, and `src/test/db.ts` — missing it in even one of the three silently collides with another service's migrations. Integration-test truncation is scoped to `dataSource.entityMetadatas` (the calling service's own tables), never a blanket schema sweep, since that would wipe every other service's data too. |
