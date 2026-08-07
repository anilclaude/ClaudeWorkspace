# ClaudeWorkspace

Two directories, cleanly separated:

| Directory | Holds | Changes when |
|---|---|---|
| [`scaffold/`](scaffold/README.md) | Process — inputs, policies, memory, templates | The *process* improves |
| [`platform/`](platform/) | Product — services, web app, packages, infra | The *product* changes |

**Read [`scaffold/memory/STATE.md`](scaffold/memory/STATE.md) first.** It says
where the build is right now.

## Architecture

Right-sized services in a monorepo. NestJS services each owning their database
exclusively, one Next.js web app reaching them through BFF route handlers, and a
`contracts` package that is the single source of truth for every cross-boundary
type. No message broker, no gateway — added when a real use case appears.

```
platform/
├── backend/auth/          NestJS · db auth_db · :4001
├── backend/core/          NestJS · db core_db · :4002
├── frontend/web/          Next.js · :3001 · BFF route handlers
└── packages/{shared,backend,frontend}/
```

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
| `/plan <service>` | PRD + wireframes → ordered, AC-bound tasks + feature branch |
| `/build` | Implement one task with tests, review it, rework until clear |
| `/commit` | Commit to the feature branch — only when every gate is green |
| `/wrap` | Refresh `STATE.md`, ship finished PRDs, record decisions |

Three agents: **planner** (plans), **builder** (writes), **reviewer** (clears).
Full policies in [`scaffold/policies/agent-policies.md`](scaffold/policies/agent-policies.md).

## Gate commands — run from `platform/`

```bash
cd platform && pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

All four pass on the current tree. They run through Turborepo, so `packages/*`
builds before the services and app that consume it.

## Non-negotiables

1. **Separation of powers** — the agent that writes code never clears it.
2. **BLOCKER is non-waivable** — no override, no deferral, by anyone.
3. **Rework cap of 3** — then stop and escalate with both positions stated.
4. **Human owns the default branch** — push, PR, and merge are always yours.
5. **Service data is private** — no service reads another's tables. Cross-service
   data goes over HTTP through a published contract.
6. **Contracts before implementation** — a cross-boundary type is added to
   `packages/shared/contracts` first, then implemented against.

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
