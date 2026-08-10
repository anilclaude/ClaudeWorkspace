# Repo structure

Input 2 of 2, alongside `tech-stack.md`. Declares the shape of the repo so it is
a decision on record rather than something inferred per session.

Shape: **right-sized services in a monorepo** — a few coarse-grained NestJS
services sharing one database and schema; one or more frontends calling them
directly (CORS-enabled, no BFF layer); and libraries kept alongside the side
that consumes them (`backend/libs/`, `frontend/libs/`), with only what's
genuinely cross-cutting (`shared/`) sitting outside both.

Not full microservices: no message broker, no API gateway, no service mesh.
Those are added when a real use case appears, not preemptively.

## Declarations

| Declaration | Value |
|---|---|
| Package scope | `@app/*` — **change this per project** |
| Workspace globs | `backend/*`, `backend/libs/*`, `frontend/web`, `frontend/mobile`, `frontend/libs/*`, `shared/*` |
| Backend shape | NestJS, module-wise `src/modules/<module>/` |
| Frontend shape | Next.js App Router, calls services directly (no BFF), module-wise `src/modules/<module>/` |
| Frontend ports | base `3000`, `+1` per app → web = 3001 |
| Backend ports | base `4000`, `+1` per service → auth = 4001, core = 4002 |
| Databases | one Postgres instance, **one shared database and schema** for every backend service (`platform_db`) — each service's migration history stays isolated in its own `<service>_migrations` table |
| Build orchestration | Turborepo |

## Tree

```
ClaudeWorkspace/
├── CLAUDE.md                          ← router (Claude Code reads this)
├── .claude/{agents,commands,skills}/  ← discovery surface only
├── docs/                              ← reference docs for humans
├── scaffold/                          ═══ PROCESS ═══
└── platform/                          ═══ PRODUCT ═══
    ├── package.json  pnpm-workspace.yaml  turbo.json
    ├── tsconfig.base.json  eslint.config.mjs
    ├── docker-compose.yml  .env.example
    │
    ├── docs/                          ← PRDs, wireframes, task ledger —
    │                                    module-wise, not scoped to one
    │                                    service or app (see below)
    │   ├── prd/{_ACTIVE,_SHIPPED}/
    │   ├── wireframes/<feature>/{index.md,*.png}
    │   ├── task-ledger-<prd-slug>.md   ← state per PRD: what's ready/in-review/done
    │   └── build-trace.md              ← timing: append-only, id+title+step+timestamp
    │
    ├── backend/                       ← everything backend-related
    │   ├── auth/                      app · NestJS · :4001
    │   │   └── src/
    │   │       ├── main.ts  app.module.ts
    │   │       ├── config/            Zod env schema, fail-fast at boot
    │   │       ├── common/            service-local cross-module code
    │   │       ├── db/                data-source, migrations
    │   │       ├── test/              integration test harness (db.ts)
    │   │       └── modules/           ═══ MODULE-WISE ═══
    │   │           └── health/
    │   ├── core/                      app · NestJS · :4002
    │   └── libs/                      libraries — backend services only
    │       └── nest-kit/    @app/nest-kit    filter, request-id middleware
    │
    ├── frontend/                      ← everything frontend-related
    │   ├── web/                       app · Next.js · :3001
    │   │   └── src/
    │   │       ├── app/               ← ROUTING ONLY, pages stay thin
    │   │       ├── modules/           ═══ MODULE-WISE ═══
    │   │       │   └── <feature>/{components,hooks,store,api,schemas}/
    │   │       ├── components/  lib/  store/
    │   ├── mobile/                    app (RESERVED — see its README)
    │   └── libs/                      libraries — frontend apps only
    │       ├── core/         @app/frontend-core  api client, slices, hooks
    │       │                                     NO renderer — web + mobile
    │       └── ui/           @app/ui             React components, WEB only
    │
    ├── shared/                        ← importable by BOTH backend and frontend
    │   ├── contracts/        @app/contracts   Zod schemas — THE source of truth
    │   └── common/           @app/common      framework-agnostic utils
    │
    └── infrastructure/
        ├── docker/postgres-init/      the one shared database + test database
        └── scripts/
```

## The library segregation rule

Libraries live beside the side that consumes them — `backend/libs/`,
`frontend/libs/` — rather than in one flat `packages/`. `shared/` is the
deliberate exception: it sits outside both because it's importable by both.
The location is what stops a library quietly becoming web-only or Nest-only.

| Folder | May be imported by | Must not contain |
|---|---|---|
| `shared/*` | Anything | Framework imports of any kind |
| `backend/libs/*` | Backend services only | React, DOM, browser APIs |
| `frontend/libs/*` | Frontend apps only | Nest, TypeORM, `node:` built-ins |

Within `frontend/libs/`, one more split matters once mobile exists:

| Package | Web | Mobile | Rule |
|---|---|---|---|
| `frontend/libs/core` | yes | yes | **No renderer.** No DOM, no React Native primitives. API clients, Redux slices, hooks. |
| `frontend/libs/ui` | yes | no | Web-only — Tailwind classes and DOM elements. |
| `frontend/libs/ui-native` | no | yes | Reserved. React Native components, if mobile lands. |

`frontend/libs/core` is what makes `frontend/mobile` viable at all — without
it, adding mobile means reimplementing the API client, the store, and
validation.

## Decisions baked into this shape

- **Service data is private by convention, not infrastructure.** Every
  backend service shares one database and schema (`platform_db`) — nothing
  physical stops a service from reading another's tables. No service does it
  anyway: cross-service data goes over HTTP through a published contract, and
  the reviewer's R7 treats a direct cross-service entity import as a BLOCKER.
  Each service's migration history stays isolated in its own
  `<service>_migrations` table, and any integration-test truncation is scoped
  to that service's own `entityMetadatas` — never a broad sweep of the schema.

- **`shared/contracts` is mandatory.** The service that serves a route and
  every consumer of it import the same Zod schema. This reverses
  CF-Monorepo's "no shared DTOs" rule, which holds only while each app talks
  solely to its own backend — with services calling each other, duplicated
  types drift silently and the drift surfaces in production.

- **No BFF layer.** The browser calls each backend service directly, using
  `NEXT_PUBLIC_*` env vars and CORS on the service side. This trades away the
  "service can move without touching client code" property a BFF would give,
  in exchange for one fewer layer to build and maintain at this size.

- **Module-wise inside every service and app.** A module owns one feature.
  Routing files import from modules and hold no logic. Only `*.service.ts`
  touches the database.

- **Promotion path for reuse.** Module-local → app- or service-local
  (`src/common`, `src/components`) → the right `libs/` folder → `shared/` only
  if genuinely needed by both sides. Never a sideways import between two
  modules' internals or two services.

- **Two build strategies.** `frontend/libs/ui` ships raw TypeScript consumed
  via Next's `transpilePackages`; every other library is tsup-compiled, because
  NestJS cannot `require()` a raw `.ts` workspace dependency.

- **No broker, no gateway, yet.** Synchronous HTTP between two services is
  easier to debug and sufficient at this size.

## Adding a service

1. `backend/<name>/` following auth's shape
2. Next free port from the scheme above
3. `migrationsTableName: '<name>_migrations'` in that service's `data-source.ts`,
   `app.module.ts`, and `src/test/db.ts` (if it has an integration harness) —
   all three must agree, or the shared database's default `migrations` table
   silently becomes a collision point between services
4. `shared/contracts/src/<name>/` for anything it publishes
5. No workspace-glob change needed — `backend/*` already covers it. No new
   database or `postgres-init` entry either — every service shares `platform_db`.

## Adding a frontend app

1. `frontend/<name>/`, next free port
2. Add it to `pnpm-workspace.yaml` — `frontend/*` is **not** globbed, so each
   app is listed explicitly. This is deliberate: `frontend/mobile` holds only a
   README until a mobile stack is declared, and a glob would make pnpm treat the
   empty folder as a broken package.
3. It may import `shared/*` and `frontend/libs/*` only.

## Adding a library

1. `backend/libs/<name>/` or `frontend/libs/<name>/`, depending on who
   consumes it — `shared/<name>/` only if genuinely needed by both sides
2. Workspace globs already cover all three locations — no config change needed
3. No framework imports that belong to the other side (see the segregation
   table above)

## Adding a module inside a service

```
src/modules/<module>/
  <module>.module.ts
  <module>.controller.ts        ← never touches the DB
  <module>.service.ts           ← all DB access lives here
  <module>.service.spec.ts
  dto/  entities/  validation/
```
