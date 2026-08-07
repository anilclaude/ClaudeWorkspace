# Repo structure

Input 2 of 2, alongside `tech-stack.md`. Declares the shape of the repo so it is
a decision on record rather than something inferred per session.

Shape: **right-sized services in a monorepo** — a few coarse-grained NestJS
services, each owning its database exclusively; one or more frontends reaching
them through BFF route handlers; and shared packages segregated by who may
consume them.

Not full microservices: no message broker, no API gateway, no service mesh.
Those are added when a real use case appears, not preemptively.

## Declarations

| Declaration | Value |
|---|---|
| Package scope | `@app/*` — **change this per project** |
| Workspace globs | `backend/*`, `frontend/web`, `frontend/mobile`, `packages/shared/*`, `packages/backend/*`, `packages/frontend/*` |
| Backend shape | NestJS, own database, module-wise `src/modules/<module>/` |
| Frontend shape | Next.js App Router, BFF route handlers, module-wise `src/modules/<module>/` |
| Frontend ports | base `3000`, `+1` per app → web = 3001 |
| Backend ports | base `4000`, `+1` per service → auth = 4001, core = 4002 |
| Databases | one Postgres instance, one DB per **service**, `<service>_db` |
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
    ├── backend/                       ← all backend services
    │   ├── auth/                      NestJS · db auth_db · :4001
    │   │   ├── docs/
    │   │   │   ├── prd/{_ACTIVE,_SHIPPED}/
    │   │   │   ├── wireframes/<feature>/{index.md,*.png}
    │   │   │   └── task-ledger.md
    │   │   └── src/
    │   │       ├── main.ts  app.module.ts
    │   │       ├── config/            Zod env schema, fail-fast at boot
    │   │       ├── common/            service-local cross-module code
    │   │       ├── db/                data-source, migrations
    │   │       └── modules/           ═══ MODULE-WISE ═══
    │   │           └── health/
    │   └── core/                      NestJS · db core_db · :4002
    │
    ├── frontend/                      ← all frontend apps
    │   ├── web/                       Next.js · :3001
    │   │   └── src/
    │   │       ├── app/               ← ROUTING ONLY, pages stay thin
    │   │       │   └── api/           ← BFF handlers (server-only)
    │   │       ├── modules/           ═══ MODULE-WISE ═══
    │   │       │   └── <feature>/{components,hooks,store,api,schemas}/
    │   │       ├── components/  lib/  store/
    │   └── mobile/                    ← RESERVED, no app yet (see its README)
    │
    ├── packages/                      ← segregated by who may consume
    │   ├── shared/                    BOTH backend and frontend
    │   │   ├── contracts/   @app/contracts   Zod schemas — THE source of truth
    │   │   └── common/      @app/common      framework-agnostic utils
    │   ├── backend/                   BACKEND ONLY
    │   │   └── nest-kit/    @app/nest-kit    filter, request-id middleware
    │   └── frontend/                  FRONTEND ONLY
    │       ├── core/        @app/frontend-core  api client, slices, hooks
    │       │                                    NO renderer — web + mobile
    │       └── ui/          @app/ui          React components, WEB only
    │
    └── infrastructure/
        ├── docker/postgres-init/      one database per service
        └── scripts/
```

## The package segregation rule

`packages/` is split three ways by **who is allowed to import it**. This is the
part that stops a shared layer quietly becoming web-only or Nest-only.

| Folder | May be imported by | Must not contain |
|---|---|---|
| `packages/shared/*` | Anything | Framework imports of any kind |
| `packages/backend/*` | Backend services only | React, DOM, browser APIs |
| `packages/frontend/*` | Frontend apps only | Nest, TypeORM, `node:` built-ins |

Within `packages/frontend/`, one more split matters once mobile exists:

| Package | Web | Mobile | Rule |
|---|---|---|---|
| `frontend/core` | yes | yes | **No renderer.** No DOM, no React Native primitives. API clients, Redux slices, hooks. |
| `frontend/ui` | yes | no | Web-only — Tailwind classes and DOM elements. |
| `frontend/ui-native` | no | yes | Reserved. React Native components, if mobile lands. |

`frontend/core` is what makes `frontend/mobile` viable at all — without it,
adding mobile means reimplementing the API client, the store, and validation.

## Decisions baked into this shape

- **Each service owns its database exclusively.** No service reads another's
  tables. Cross-service data goes over HTTP through a published contract.

- **`packages/shared/contracts` is mandatory.** The service that serves a route
  and every consumer of it import the same Zod schema. This reverses
  CF-Monorepo's "no shared DTOs" rule, which holds only while each app talks
  solely to its own backend — with services calling each other, duplicated
  types drift silently and the drift surfaces in production.

- **BFF boundary.** The browser calls `frontend/web`'s own route handlers; those
  call services using server-only env vars. A service can move, split, or change
  port without touching client code.

- **Module-wise inside every service and app.** A module owns one feature.
  Routing files import from modules and hold no logic. Only `*.service.ts`
  touches the database.

- **Promotion path for reuse.** Module-local → app- or service-local
  (`src/common`, `src/components`) → the right `packages/` bucket. Never a
  sideways import between two modules' internals or two services.

- **Two build strategies.** `packages/frontend/ui` ships raw TypeScript consumed
  via Next's `transpilePackages`; everything else in `packages/` is tsup-compiled,
  because NestJS cannot `require()` a raw `.ts` workspace dependency.

- **No broker, no gateway, yet.** Synchronous HTTP between two services is
  easier to debug and sufficient at this size.

## Adding a service

1. `backend/<name>/` following auth's shape
2. Next free port from the scheme above
3. `<name>_db` line in `infrastructure/docker/postgres-init/init-databases.sh`
4. `packages/shared/contracts/src/<name>/` for anything it publishes
5. No workspace-glob change needed — `backend/*` already covers it

## Adding a frontend app

1. `frontend/<name>/`, next free port
2. Add it to `pnpm-workspace.yaml` — `frontend/*` is **not** globbed, so each
   app is listed explicitly. This is deliberate: `frontend/mobile` holds only a
   README until a mobile stack is declared, and a glob would make pnpm treat the
   empty folder as a broken package.
3. It may import `packages/shared/*` and `packages/frontend/*` only.

## Adding a module inside a service

```
src/modules/<module>/
  <module>.module.ts
  <module>.controller.ts        ← never touches the DB
  <module>.service.ts           ← all DB access lives here
  <module>.service.spec.ts
  dto/  entities/  validation/
```
