# Scaffolding Structure — Lite

**Base Workspace — Lite** · Right-Sized Services · Prerequisites & Structure (Lite v2)

What must exist on disk, and what must be decided, before Claude can build from a PRD and wireframes. Describes the workspace as actually built and verified.

- 3 agents · 22 policies · 4 commands · 6 stages
- Right-sized services in a monorepo — NestJS services owning their own databases, one Next.js BFF web app, shared packages including `contracts`
- Not full microservices: no broker, no gateway, no service mesh

_Supersedes Lite v1, which described a flat single-app layout._

## 1. Two directories, cleanly separated

| Directory | Holds | Changes when |
|---|---|---|
| `scaffold/` | Process — inputs, policies, memory, templates | The process improves |
| `platform/` | Product — services, web app, packages, infrastructure | The product changes |

Claude Code discovers `.claude/agents/` and `.claude/commands/` at the project root, so those stay at the workspace root as a thin discovery surface. Everything they reference lives in `scaffold/`.

**Rule:** no product code in `scaffold/`, no process docs in `platform/`.

## 2. Prerequisites

### A. Decisions that must be made first

| # | Prerequisite | Failure if missing |
|---|---|---|
| A1 | Tech stack pinned — framework, ORM, DB, UI library, test runner, with versions | Claude picks a different library per session; the codebase drifts into three patterns |
| A2 | Repo shape declared in repo-structure.md — scope, globs, ports, DB ownership | The shape gets inferred per session instead of read, and drifts |
| A3 | Definition of Done — even five lines | "Done" means whatever the last session felt like |
| A4 | Who commits — you, or /commit after gates | Either nothing gets committed, or things get committed unreviewed |

### B. Input artifacts

A PRD in the five-section shape (§5) and wireframes in the exported-with-index shape (§6).

### C. Environment

Node 24 and pnpm 9; git repo initialized; Docker for local Postgres; `.env.example` committed with `.env` gitignored.

### D. The prerequisite most people miss

**Every quality gate must exist and pass on the empty scaffold, before the first PRD is built.**

```bash
cd platform && pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

If these do not all run green with zero features, the reviewer cannot enforce anything and "tests pass" means nothing for the life of the project.

## 3. The structure

```
ClaudeWorkspace/
├── CLAUDE.md                  ← router
├── .claude/{agents,commands,skills}/
│
├── scaffold/                  ═══ PROCESS ═══
│   ├── README.md
│   ├── inputs/{tech-stack.md,repo-structure.md}
│   ├── policies/agent-policies.md
│   ├── memory/{STATE.md,DECISIONS.md}
│   └── templates/
│
└── platform/                  ═══ PRODUCT ═══
    ├── services/auth/         NestJS · auth_db · :4001
    │   ├── docs/{prd,wireframes,task-ledger.md}
    │   └── src/{config,common,db,modules/<module>/}
    ├── services/core/         NestJS · core_db · :4002
    ├── web/portal/            Next.js · :3001
    │   └── src/{app/,modules/<feature>/,components,lib,store}
    ├── packages/{contracts,common,nest-kit,ui}/
    └── infrastructure/
```

## 4. The loop — 6 stages

```
PRD + wireframes → /plan → /build (implement → review → rework) → /commit → /wrap → human push/PR/merge
```

Rework cap: 3 cycles on one task, then stop and escalate.

## 5. PRD minimum shape

| # | Section | Content |
|---|---|---|
| 1 | What we are building | Two or three paragraphs — what it does, who uses it, why it exists |
| 2 | Screens / user stories | One entry per screen, each naming its wireframe folder |
| 3 | Acceptance criteria | NUMBERED. TESTABLE. Step-wise. This is what everything else hangs off. |
| 4 | Data entities | Rough fields and relationships; exact types are the builder call |
| 5 | Out of scope | Explicit — this is what stops scope drift mid-build |

**Writing ACs that work:**

| Bad | Good |
|---|---|
| The login should be secure | After 5 failed attempts in 15 minutes, further attempts return 429 until the window expires |
| Errors are handled nicely | When the API returns 500, an error banner reads "Something went wrong. Try again." and the form stays filled |
| Fast page load | The dashboard renders a skeleton within 100ms and real data within 2s on a 3G profile |

## 6. Wireframe minimum shape

| Requirement | Why |
|---|---|
| Exported as PNG/JPG into the repo | Claude reads images directly. A design-tool link alone is not readable at build time |
| One folder per feature, named to match the PRD file | This naming is the only thing connecting a screen to its ACs |
| index.md per folder, mapping each screen to its AC numbers | This is the binding. Without it the wireframe is decoration and P2/B7 cannot be enforced |
| Loading / empty / error states stated — drawn, or written | Otherwise you get a happy-path UI and three missing states per screen |
| Responsive intent noted | Otherwise it ships desktop-only and is reworked later |

## 7. Module boundaries

| Level | When | Where |
|---|---|---|
| Module-local | Anything only this feature uses | src/modules/<module>/ |
| Service- or app-local | Used by 2+ modules in the same package | src/common/ (service) · src/components/, src/lib/ (web) |
| Cross-package | Used by 2+ services or by a service and the web app | packages/* |
| Never | One module reaching into another module internals, or one service reading another database | — |

## 8. Task ledger

```yaml
- id: T01
  title: Login form with validation
  ac: [AC1, AC2]
  wireframe: docs/wireframes/login/login-default.png
  status: ready        # ready | in_progress | in_review | rework | done
  branch: feature/auth/login
  review_cycles: 0
  commit: null
```

## 9. Decisions baked into this shape

- Each service owns its database exclusively. No service reads another tables; cross-service data goes over HTTP through a published contract.
- packages/contracts is mandatory, not optional. The service serving a route and every consumer import the same Zod schema. This reverses CF-Monorepo "no shared DTOs" rule, which holds only while each app talks solely to its own backend.
- BFF boundary. The browser calls the web app own route handlers; those call services using server-only env vars. A service can move, split, or change port without touching client code.
- Module-wise inside every service and app. Routing files import from modules and hold no logic. Only *.service.ts touches the database.
- Two build strategies. packages/ui ships raw TypeScript via Next transpilePackages; contracts, common, and nest-kit are tsup-compiled, because NestJS cannot require() a raw .ts workspace dependency.
- No broker, no gateway, yet. Synchronous HTTP between two services is easier to debug and sufficient at this size.
- The workspace is the template. There is no separate copy to maintain — a hand-kept template drifts the first time the real one improves.

## 10. Starting a new project

| # | Step |
|---|---|
| 1 | Clone platform/, delete services/*/docs/prd/_ACTIVE/* and any service you do not need |
| 2 | Copy scaffold/ and .claude/, clear memory/STATE.md and memory/DECISIONS.md |
| 3 | Rename the package scope — @app/* to your own |
| 4 | Fill in scaffold/inputs/tech-stack.md — every row, pinned versions |
| 5 | Verify all four gates green on the empty scaffold (prerequisite D) |
| 6 | Fill in the root CLAUDE.md |
| 7 | Write the first PRD into platform/services/<service>/docs/prd/_ACTIVE/ |
| 8 | Export wireframes with index.md mapping screens to ACs |
| 9 | Run /plan <service> |

## 11. When to graduate

| Add | When |
|---|---|
| auditor agent + profile | Money, PII, or multi-tenant data enters |
| estimator + build-log.md | You need to forecast delivery dates |
| /signoff + _SIGNOFF/ | Someone other than you approves scope |
| /accept + acceptance/ | The approver is not the person building |
| Design stage + design/ | A schema change breaks something in production |
| decision-resolver | HOLDs need routing to different people |
| Message broker | A genuine async workflow appears between services |
