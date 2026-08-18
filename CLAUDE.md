# ClaudeWorkspace

One repository, two directories with different jobs:

| Directory | Holds | Changes when |
|---|---|---|
| [`scaffold/`](scaffold/README.md) | Process — inputs, policies, memory, templates | The *process* improves |
| [`platform/`](platform/) | Product — backend services, frontend apps, shared libs, infra | The *product* changes |

Both live in this repo's history together — `platform/` was previously its own
nested git repo (versioned separately) but has since been merged in.

**Read [`scaffold/memory/STATE.md`](scaffold/memory/STATE.md) first.** It says
where the build is right now.

## Architecture

Right-sized services in a monorepo. NestJS services, one Next.js web app
calling them directly from the browser (CORS-enabled, no BFF layer), and a
`contracts` package that is the single source of truth for every
cross-boundary type. No message broker, no gateway — added when a real use
case appears.

Every backend service shares one database and schema (`platform_db`) — data
privacy between services is a code-review convention (see Non-negotiable #5
below), not an infrastructure guarantee. Each service's migration history is
still isolated: its own `<service>_migrations` table, never the shared default.

```
platform/
├── docs/                  PRDs, wireframes, task ledger — module-wise, not
│                          scoped to one service or app (see below)
├── backend/auth/          NestJS · :4001
├── backend/core/          NestJS · :4002
├── backend/libs/          libraries backend services may import
├── frontend/web/          Next.js · :3001 · calls services directly (CORS)
├── frontend/libs/         libraries frontend apps may import
└── shared/                importable by both — contracts, common
```

PRDs live at `platform/docs/`, not inside any one service or app — a single PRD
routinely produces tasks in more than one of them.

Module-wise inside every service and app: `src/modules/<module>/`. Routing files
import from modules and hold no logic. Only `*.service.ts` touches the database.

## Inputs — these two files decide everything

| File | Decides |
|---|---|
| [`scaffold/inputs/tech-stack.md`](scaffold/inputs/tech-stack.md) | Libraries and pinned versions. A PRD naming a different stack is describing features, not tech decisions — the stack file wins. |
| [`scaffold/inputs/repo-structure.md`](scaffold/inputs/repo-structure.md) | Folder shape, scope, ports, database ownership, import boundaries. |

Do not introduce a library that isn't in `tech-stack.md`.

## The loop

```
PRD → /plan → /build (implement → review → rework) → /commit → /wrap
```

| Command | Does |
|---|---|
| `/plan` | PRD + wireframes → ordered, AC-bound tasks in `platform/docs/taskplanned/task-ledger-<prd-slug>.md` |
| `/build` | Implement one task with tests, review it, rework until clear |
| `/commit` | Commit to `main` — only when every gate is green |
| `/wrap` | Refresh `STATE.md`, ship finished PRDs, record decisions |

Three agents: **planner** (plans), **builder** (writes), **reviewer** (clears).
Full policies in [`scaffold/policies/agent-policies.md`](scaffold/policies/agent-policies.md).

## Gate commands — run from `platform/`

```bash
cd platform && pnpm build && pnpm typecheck && pnpm lint && pnpm test   # no Docker needed
pnpm test:int                                                          # needs pnpm db:up
```

First run, ports, and the migration workflow: [`platform/README.md`](platform/README.md).

All five pass on the current tree. The first four run through Turborepo, so
`shared/*`, `backend/libs/*`, and `frontend/libs/*` build before the services
and apps that consume them. `test:int` requires a running database and is
excluded from that build order — see `platform/README.md`'s Integration tests
section for why it's a separate gate rather than folded into `test`.

## Non-negotiables

1. **Separation of powers** — the agent that writes code never clears it.
2. **BLOCKER is non-waivable** — no override, no deferral, by anyone.
3. **Rework cap of 3** — then stop and escalate with both positions stated.
4. **Human owns push and PR to any remote.** Local merges to the default branch
   are fine — there is no feature-branch-per-PRD convention; everything builds
   directly on `main`. A remote (`origin`) exists, but pushing to it and
   opening PRs is a human action, never automatic — the isolation a
   feature branch buys doesn't apply here regardless.
5. **Service data is private — by convention, not infrastructure.** Every
   backend service shares one database and schema, so nothing physically stops
   a service from querying another's tables. It still must not: cross-service
   data goes over HTTP through a published contract, and the reviewer checks
   for a direct import of another service's entities/repositories as a
   BLOCKER, since that's now possible where it used to be structurally
   impossible.
6. **Contracts before implementation** — a cross-boundary type is added to
   `shared/contracts` first, then implemented against.

## Definition of Done

- [ ] Every bound AC is implemented
- [ ] At least one test per AC, and each would fail if the code were wrong
- [ ] `build`, `typecheck`, `lint`, `test` all green
- [ ] UI matches its wireframe, including loading, empty, and error states
- [ ] No hardcoded secrets; no secret logged
- [ ] Zero open BLOCKERs
- [ ] Any default taken under ambiguity is logged in `scaffold/memory/DECISIONS.md`

## Session start / end

Start: read `scaffold/memory/STATE.md`. End: run `/wrap`, even on a short session.
