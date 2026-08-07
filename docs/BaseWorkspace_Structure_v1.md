# Base Workspace — Scaffolding Structure

**Stack-Agnostic Multi-Project Scaffold (v1)**

The structural companion to `BaseWorkspace_Agent_Policies_v1`. That document defines *who decides what*; this one defines *what exists on disk and where*.

Derived from CF-Monorepo's `MonoRepoStructure.md`, generalized so the stack is an input rather than a constant.

---

## 1. Two layers, and why the distinction matters

CF-Monorepo has one layer: a repo that *is* the project. The base workspace has two:

| Layer | What it is | Lives where | Changes when |
|---|---|---|---|
| **Template layer** | The generator. Agents, commands, disciplines, templates, scripts. Contains no application code. | The base workspace repo | The process improves |
| **Generated layer** | A real project. Apps, shared packages, infra, its own copy of the process layer. | Each project's own repo | The product is built |

Everything in §2 is the template layer. §5 is what the generated layer looks like. The two must never be conflated — the most common failure mode for a scaffold like this is application code leaking into the template, at which point it stops being a template and becomes a fork.

**Rule:** the base workspace has an empty `apps/`. If anything is in it, something has gone wrong.

---

## 2. The base workspace tree

```
BaseWorkspace/
├── README.md                            ← what this is, how to generate a project
├── WorkspaceStructure.md                ← THIS FILE
├── CLAUDE.md                            ← ~120-line router, NOT a rulebook (see §6)
├── template.config.json                 ← schema version, defaults, supported presets
├── .gitignore  .editorconfig  .nvmrc  .npmrc
│
├── inputs/                              ← USER-AUTHORED. Read at generation time.
│   ├── README.md                        ← how to fill these in
│   ├── tech-stack.md                    ← REQUIRED — what to build with
│   ├── repo-structure.md                ← REQUIRED — what shape to build it in
│   ├── decision-routing.md              ← REQUIRED — who approves what
│   ├── profiles.md                      ← which discipline profiles are active
│   └── presets/                         ← starting points, `extends:` targets
│       ├── nest-typeorm-next.md         ← ≈ today's CF-Monorepo
│       ├── express-prisma-next.md       ← ≈ today's ClaudeWorkspace CLAUDE.md
│       └── minimal-node-api.md
│
├── .claude/
│   ├── agents/                          ← SIX. Never more without a failure first.
│   │   ├── prd-mapper.md                ← Lead/Architect — planning
│   │   ├── builder.md                   ← Developer
│   │   ├── reviewer.md                  ← Lead — review + acceptance
│   │   ├── auditor.md                   ← Specialist, risk-gated
│   │   ├── estimator.md                 ← Sizing + calibration
│   │   └── decision-resolver.md         ← Escalation + defect triage
│   │
│   ├── commands/
│   │   ├── — workspace generation —
│   │   │   ├── init-workspace.md        ← consume inputs/, emit a project
│   │   │   └── new-app.md               ← add an app to an existing project
│   │   ├── — SDLC pipeline —
│   │   │   ├── signoff.md               ← stage 2   (human checkpoint)
│   │   │   ├── plan.md                  ← stages 3-4
│   │   │   ├── build.md                 ← stages 6-9
│   │   │   ├── loop.md                  ← stage 5 dispatch, unattended
│   │   │   ├── audit.md                 ← stage 8a, standalone
│   │   │   ├── verify.md                ← stage 10
│   │   │   ├── commit.md                ← stage 11
│   │   │   ├── accept.md                ← stage 13
│   │   │   └── status.md                ← read-only pipeline view
│   │   ├── — governance —
│   │   │   ├── decide.md  resolve.md  review-batch.md
│   │   │   └── defect.md                ← post-merge bug lane
│   │   └── — cadence —
│   │       ├── velocity.md  roadmap.md  wrap.md
│   │       └── scaffold-upgrade.md      ← pull newer template into a project
│   │
│   └── skills/                          ← disciplines, PROGRESSIVE DISCLOSURE
│       ├── core/                        ← always available, stack-agnostic
│       │   ├── build-review-audit-loop/
│       │   ├── validation-contracts/
│       │   ├── blocker-tier-policy/
│       │   ├── gate-reliability/
│       │   ├── decision-routing/
│       │   ├── memory-loop/
│       │   ├── velocity-gears/
│       │   ├── git-branching/
│       │   ├── coding-conventions/
│       │   ├── release-reliability/
│       │   ├── performance/
│       │   ├── prd-refinement/
│       │   ├── module-dependency-map/
│       │   ├── token-efficiency/
│       │   └── model-upgrade-recalibration/
│       └── profiles/                    ← opt-in per inputs/profiles.md
│           ├── financial/               ← five-assertion, cross-foot,
│           │                               confidence-threshold, date-range
│           │                               echo-back, money-precision,
│           │                               audit-log-retention
│           ├── multi-tenant/            ← cross-tenant safety, default-deny
│           └── compliance-soc2/         ← security controls, audit evidence
│
├── docs/
│   ├── sdlc/                            ← the process, as committed docs
│   │   ├── pipeline.md                  ← the 15-stage model, single source of truth
│   │   ├── agent-policies.md            ← the 86 policies (md twin of the docx)
│   │   ├── definition-of-ready.md       ← what "signed off" requires
│   │   ├── definition-of-done.md        ← what "done" requires
│   │   ├── gate-policy.md               ← what blocks what
│   │   ├── risk-flags.md                ← which flags fire which specialist gate
│   │   ├── escalation.md                ← rework cap, deadlock, HOLD routing
│   │   └── roles-map.md                 ← agent ↔ real job title
│   ├── generation/
│   │   ├── input-schema.md              ← the contract both input files must satisfy
│   │   ├── resolution.md                ← how stack → template is decided
│   │   └── upgrade.md                   ← how a project pulls a newer template
│   └── artifacts/                       ← EMPTY starting files, copied on generation
│       ├── STATE.template.md
│       ├── DECISIONS.template.md
│       ├── build-log.template.md
│       └── task-ledger.template.md
│
├── templates/                           ← what generation actually copies
│   ├── root/                            ← package.json, turbo/nx config, tsconfig
│   │                                       base, lint/format, husky, compose
│   ├── frontend/
│   │   └── next-app-router/             ← + additional variants as added
│   ├── backend/
│   │   ├── nest-typeorm/
│   │   └── express-prisma/
│   ├── shared/
│   │   ├── common/  backend/  frontend/  bff/
│   ├── app-docs/                        ← the per-app docs tree (see §5.2)
│   ├── infrastructure/
│   │   ├── Dockerfile                   ← ONE, parameterized by ARG
│   │   ├── compose/  scripts/  terraform/
│   └── ci/
│       ├── pr.yml  main.yml  security.yml
│
├── scripts/
│   ├── init-workspace.mjs               ← inputs/ → a generated project
│   ├── new-app.mjs                      ← add an app, wire every touch point
│   ├── validate-inputs.mjs              ← schema + contradiction check
│   ├── scaffold-upgrade.mjs             ← three-way merge of template changes
│   └── lib/{resolve,render,rename,ports}.mjs
│
└── .workspace/
    └── resolved.json                    ← machine-readable merge of both inputs
```

`apps/` is **absent by design**. The base workspace holds no application code.

---

## 3. The input contract

Two files the user authors before anything is generated. They are the only place stack and shape are decided.

### 3.1 `inputs/tech-stack.md`

Human-authored markdown with a required section per layer. Every entry carries a **pinned version**.

```
schemaVersion: 1
extends: presets/nest-typeorm-next.md     ← optional; overrides below win

## Runtime          Node 24.x · pnpm 9.x · Turborepo 2.x
## Frontend         framework · UI · state · forms · HTTP · icons
## Backend          framework · ORM · database · validation · auth
## Testing          unit · integration · e2e · coverage threshold
## Quality          linter · formatter · hooks
## Delivery         container · registry · deploy target
```

Anything omitted is **asked**, never defaulted silently. Answers are written back into this file so the next run is non-interactive.

### 3.2 `inputs/repo-structure.md`

A fenced directory tree with `←` annotations — deliberately the same format as CF-Monorepo's `MonoRepoStructure.md`, because it is already the right shape for a human to author and an agent to parse. Must declare:

| Declaration | Example |
|---|---|
| Package scope | `@acme/*` |
| Workspace globs | `apps/*/frontend`, `apps/*/backend`, `shared/*` |
| App shape | `frontend + backend` \| `backend only` \| `single app` |
| Shared packages | `common`, `backend`, `frontend`, `bff` |
| Port scheme | frontend base `3000`, backend base `4000`, `+1` per app |
| Database convention | one instance, one DB per app, prefix `acme_` |

### 3.3 `inputs/decision-routing.md`

The HOLD/CAPTURE-AND-PROCEED routing table — decision type → named approver. This is the file CF-Monorepo hardcoded into `CLAUDE.md`; making it an input is what lets the same scaffold serve a different team.

### 3.4 Validation, before anything is written

`validate-inputs.mjs` fails **loud and early** on:

- a missing required section or unpinned version
- a structure referencing a template that does not exist
- **contradiction between the two files** — e.g. structure declares `apps/*/backend` but the stack names no backend framework
- a profile enabled in `profiles.md` with no matching `skills/profiles/` folder

Output is `.workspace/resolved.json`. Nothing generates until it validates.

---

## 4. Generation flow

```
  inputs/*.md
      │
      ▼
  validate-inputs.mjs ──── fail ──▶ report missing/contradictory, STOP
      │ pass
      ▼
  .workspace/resolved.json
      │
      ▼
  init-workspace.mjs
      ├─ resolve templates/           per stack dimension
      ├─ render root config           scope rename, catalog, ports
      ├─ copy .claude/                6 agents, commands, core skills
      ├─ copy enabled profiles only
      ├─ copy docs/sdlc/              pipeline, policies, DoR, DoD
      ├─ seed empty artifacts         STATE, DECISIONS, build-log, ledger
      └─ git init + first commit
      │
      ▼
  new-app.mjs <name>  (repeatable)
      ├─ frontend + backend from resolved templates
      ├─ app docs tree                _INTAKE … _SHIPPED
      ├─ port assignment              from the registry, never hand-picked
      ├─ database entry               into the init manifest
      ├─ CI path filter               into the app manifest
      └─ workspace glob check
```

`--dry-run` on both scripts prints the tree that *would* be written. Given an agent may drive these, previewing before writing is not optional politeness — it is the difference between a reviewable action and an unreviewable one.

---

## 5. What a generated project looks like

### 5.1 Project root

```
<project>/
├── CLAUDE.md                    ← generated: this project's stack, profiles, apps
├── inputs/                      ← COMMITTED. The generation record.
├── .claude/{agents,commands,skills}
├── docs/
│   ├── sdlc/                    ← copied from template
│   ├── changelog/               ← repo-wide session entries
│   └── decisions/               ← rotated DECISIONS archive
├── STATE.md                     ← cross-cutting + one line per app
├── DECISIONS.md                 ← open HOLDs + recent; older rotates to docs/decisions/
├── build-log.md                 ← rolling calibration window
├── apps/                        ← populated by new-app.mjs
├── shared/{common,backend,frontend,bff}
├── infrastructure/{docker,compose,scripts,terraform}
├── .github/workflows/{pr,main,security}.yml
└── <root configs — stack-resolved>
```

### 5.2 Per-app anatomy

```
apps/<app>/
├── docs/
│   ├── prd/
│   │   ├── _INTAKE/             ← pre-refinement drafts          (NEW vs CF)
│   │   ├── _ACTIVE/             ← refined AND signed off
│   │   ├── _SIGNOFF/            ← approver, date, PRD hash       (NEW vs CF)
│   │   ├── _CHANGE_REQUESTS/    ← the CR fast lane
│   │   ├── _CONTEXT/  _DEFERRED/  _LOGS/
│   │   └── _SHIPPED/{prd,cr}/
│   ├── design/                  ← risk-gated design.md            (NEW vs CF)
│   ├── acceptance/              ← acceptance reports              (NEW vs CF)
│   ├── defects/                 ← post-merge bug lane             (NEW vs CF)
│   ├── wireframes/
│   ├── changelog/
│   ├── task-ledger.md           ← replaces build-tasks.md         (NEW vs CF)
│   ├── STATE.md
│   └── DECISIONS.md             ← read-only filtered mirror
├── frontend/                    ← shape per resolved stack
└── backend/                     ← shape per resolved stack
```

Five folders and one file are new against CF-Monorepo. Each exists to give a pipeline stage somewhere durable to write — a stage whose output has no home is a stage that silently doesn't happen.

### 5.3 The task ledger

`build-tasks.md`'s `- [ ]` records only *done*, which is why status, ownership, blockers, and review history had nowhere to live. Replaced by one record per task:

```yaml
id: AUTH-T07
prd: _ACTIVE/Auth_Module.md
ac: [AC12, AC13]          vc: [VC-018, VC-019]
design: docs/design/auth-password-reset.md    # or "waived: no risk flag"
estimate: { band: M, hours: 3 }
depends_on: [AUTH-T05]
status: in_review         # ready|blocked|in_progress|self_check|in_review
                          # |rework|verified|committed|merged|accepted
risk_flags: [security, schema]      # ← fires the auditor automatically
branch: feature/auth/auth-module
review_cycles: 2                    # ← escalates at 3
findings_open: 0          commit: null
```

`status` is what makes `/status` possible, escalation automatic, and the pipeline inspectable between sessions.

---

## 6. `CLAUDE.md` is a router, not a rulebook

CF-Monorepo's `CLAUDE.md` is 16KB and fans out to ~950 lines of `docs/`. It loads **every session, before any work**. The generated `CLAUDE.md` is capped at ~120 lines and carries only:

1. What this project is, and its apps
2. Resolved stack summary — pointing at `inputs/tech-stack.md`, not restating it
3. Active profiles
4. Where the scaffold lives (this file, `docs/sdlc/`)
5. The three human checkpoints
6. `STATE.md` first — the session entry point

Every rule moves to `.claude/skills/`, loaded on description match. Same discipline, a fraction of the standing context cost.

A context budget for always-loaded files is checked at `/wrap`. Without one, `CLAUDE.md` re-bloats — that is exactly how the 16KB version happened.

---

## 7. Key decisions baked into this structure

- **The stack is an input, not a constant.** Every stack-specific rule is either generated from `inputs/tech-stack.md` or lives in a template variant. No agent definition names a framework.
- **The domain is a profile, not a default.** Accounting disciplines ship in `skills/profiles/financial/` and are inert unless enabled. CF-Monorepo becomes `profiles: [financial, multi-tenant, compliance-soc2]` — reproducing itself from the base is the acceptance test for the whole design.
- **Generate, never replicate.** One parameterized `Dockerfile`, not ten near-identical ones. Ports, databases, CI filters, and workspace globs derive from a manifest. Adding an app is one command, not eight hand-copies.
- **Six agents, and adding a seventh requires a demonstrated failure.** Steps without judgment are commands; rules binding all agents are cross-cutting policies. Neither justifies an agent.
- **Exactly one actor commits, and never to the default branch.** `/commit`, feature branch only, after every gate is green. Push, PR, and merge stay human.
- **Every stage transition writes to disk.** `design/`, `_SIGNOFF/`, `acceptance/`, `task-ledger.md` exist so no stage lives only in a conversation that ends.
- **Progressive disclosure over standing context.** Disciplines are skills, not always-loaded prose.
- **Memory files are bounded.** `DECISIONS.md` rotates to `docs/decisions/`; `build-log.md` keeps a rolling window. CF-Monorepo's reached 197KB — the memory loop otherwise consumes the context it was built to save.
- **Inputs are committed.** They are the generation record and the input to `/scaffold-upgrade`. A project that loses them cannot be safely upgraded.
- **Cross-platform by default.** No `rm -rf` in scripts, no bash-only bootstrap. Windows is a first-class target.

---

## 8. Deliberately absent

| Not here | Why |
|---|---|
| `apps/` with anything in it | The template holds no application code |
| A default stack in agent definitions | Would defeat the input contract |
| CF's five apps, PRDs, wireframes | Reference material at most |
| Named approvers | Moved to `inputs/decision-routing.md` |
| Financial disciplines in `core/` | Profile-gated |
| A release/deploy stage | Deferred with G9 — pipeline ends at acceptance |
| A QA agent | Folded into builder + reviewer; reopen only if a real QA function exists |

---

## 9. Open items

1. **Template coverage at v1** — ship `nest-typeorm-next` only, or `express-prisma-next` alongside it? Template resolution cannot be built without this answer.
2. **Structure-file expressiveness** — monorepo-only, or must it also express single-app and backend-only repos? This is the difference between a config parser and a general generator.
3. **Generation mechanism** — deterministic script, agent-driven, or hybrid (script for structure, agent for gaps). Hybrid is the recommendation.
4. **Upgrade semantics** — is `/scaffold-upgrade` a three-way merge against user edits, or advisory-diff only?
5. **Concurrency** — concurrent builders need git worktree isolation; a sequential queue needs nothing new. Unresolved from the policy document.
6. **Workspace location** — both current workspaces sit under OneDrive, which syncs `node_modules/`, `.git/`, and live Postgres data. Moving off it is a prerequisite, not a preference.
