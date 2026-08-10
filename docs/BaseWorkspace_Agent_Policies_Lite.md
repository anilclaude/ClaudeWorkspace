# Agent Policies — Lite

**Base Workspace — Lite** · Minimum Viable Policy Set (Lite v2)

The reduced policy set for single-app projects built from a PRD and wireframes, with one person driving. Cut down from the 102-policy full set by removing everything that manages coordination rather than correctness.

What survives is the correctness machinery, and it is small: build what the AC says, test it for real, never let the writer clear their own work, never destroy the git tree, never leak secrets.

- 3 agents — planner, builder, reviewer
- 21 agent policies + 6 cross-cutting = 27 total
- 4 commands — `/plan`, `/build`, `/commit`, `/wrap`
- Prerequisites and structure: see `BaseWorkspace_Structure_Lite`

_Supersedes Lite v1: B7 now requires actually reading the wireframe image before writing code (not just citing it), builds from `@app/ui`’s shared components, and the reviewer gets a matching check (R6) plus `/build` gained a screenshot-comparison step. Cross-cutting gained X5/X6 — service-data privacy and contracts-before-implementation — which were already live in `CLAUDE.md`’s non-negotiables but had never been added here. Backend services then moved to one shared database and schema (`platform_db`) instead of one database per service — X5’s guarantee stopped being physical, so the new R7 makes it a review-time BLOCKER instead. The planner then gained P6 — a narrow, opt-in exception to P4’s one-task-per-AC default, for genuinely small/adjacent/low-risk ACs, to cut down on fixed per-task overhead (context read, policy read, gate run, live-verification restart) that’s paid once per task regardless of how small the change is._

## 1. Planner — 6 policies

_SDLC role: Lead / Architect. Turns a PRD and its wireframes into ordered, AC-bound tasks._

| # | Policy | Description | Severity |
|---|---|---|---|
| P1 | PRD-Ready Gate | Refuse to plan a PRD whose acceptance criteria are not numbered and testable. Report exactly which ACs need rewriting, and stop. Never backfill or invent an AC — an invented AC is worse than a missing one, because it looks approved. | Critical |
| P2 | Wireframe Binding | Every UI task cites the wireframe file it implements, taken from that feature’s index.md. A UI task with no wireframe reference is a stop. A PRD screen with no wireframe is reported and halts planning. | High |
| P3 | AC Coverage | Every acceptance criterion maps to at least one task. An unmapped AC halts planning — report the orphans rather than quietly dropping them. | Critical |
| P4 | Task Sizing | One task is reviewable in one sitting. Split anything larger. Prefer one task per AC; combine only when two ACs are genuinely inseparable, and say so. | Medium |
| P5 | Clean Tree Gate | Verify a clean working tree on master before writing anything, and halt if dirty. No branch is created — planning and building both happen directly on master (single local machine, no remote). Never commit, push, merge, or rebase. | High |
| P6 | Adjacent AC Grouping | Bind 2-3 ACs to one task only when all of: same file/module region, each AC individually small/polish-level (not a new endpoint, entity, migration, or security/data-integrity work), neither AC is B8 HOLD-risk. Say why in the ledger note. Narrower than "combine when convenient" — most ACs still get their own task; P4’s reviewable-in-one-sitting ceiling still caps group size. | Medium |

## 2. Builder — 8 policies

_SDLC role: Developer. The only agent that writes application code._

| # | Policy | Description | Severity |
|---|---|---|---|
| B1 | Build Exactly the AC | Implement the bound acceptance criteria — nothing speculative added, nothing required left out. An unrequested refactor is scope creep and makes the diff unreviewable. | High |
| B2 | Test Per AC | At least one test per bound AC, written alongside the implementation rather than after the reviewer asks. Each test names the AC it exercises. | Critical |
| B3 | No Test Suppression | Never delete, skip, disable, or weaken a test to make a run pass, and never edit an assertion to match whatever the code produced. If a test fails, decide whether the code or the test is wrong — and say which. | Critical |
| B4 | Git Discipline | Halt on a dirty tree. Check out only the branch the planner created; halt if it is missing. Never run commit, push, merge, rebase, reset, or checkout -b. Read-only git is fine for orientation. | Critical |
| B5 | No Secrets | Nothing hardcoded, nothing secret logged, no raw entity returned in a response where it could leak a password hash or token. Use .env and keep .env.example current. | Critical |
| B6 | Stack Conformance | Use only the libraries and versions in tech-stack.md. Adding or swapping a dependency is a decision to log and surface, not a choice to make mid-task. | High |
| B7 | Wireframe Fidelity | Read the wireframe PNG(s) the task cites before writing any component code — citing the filename is not the same as looking at it. UI matches what’s drawn — layout, hierarchy, and content. Implement loading, empty, and error states even when only the happy path is drawn; log the defaults chosen. Build from @app/ui’s shared components (Button, Field, Badge, Card) rather than improvising raw markup per screen. A screen with no empty state is not done. | High |
| B8 | HOLD vs Proceed | Stop and log a HOLD on security, data-integrity, or irreversible decisions where you are genuinely unsure. Otherwise pick a defensible default, keep building, and note it. Do not stall on a reversible naming choice. | High |

## 3. Reviewer — 7 policies

_SDLC role: Lead (review). Adversarial and read-only._

| # | Policy | Description | Severity |
|---|---|---|---|
| R1 | Assertion Coverage | For every test ask: “would this test fail if the system did the wrong thing?” A test that passes without exercising its AC is itself a BLOCKER. Green tests that test nothing are worse than no tests, because they hide the gap. | Critical |
| R2 | AC Traceability | Check the diff against what the acceptance criterion says — not against whether the builder’s own tests are green. Tests prove the code does what the builder thought; only the AC says what it should do. | Critical |
| R3 | Suppression Detection | Scan for deleted, skipped, or weakened tests and for assertions edited to match output. Any occurrence is an automatic BLOCKER regardless of the justification offered. | Critical |
| R4 | Baseline Security Scan | Automatic BLOCKER for: a hardcoded secret or token; a secret written to logs; a protected route with no authorization check; external input used without server-side validation; a raw entity leaking a hash or token. | Critical |
| R5 | Findings, Not Fixes | Findings in exactly three tiers — BLOCKER / SHOULD-FIX / NIT — each citing file:line and the AC it relates to. Never fix what you find, even a one-character fix. The agent that writes the code is never the agent that clears it. | High |
| R6 | Conformance Sweep | At SHOULD-FIX unless noted: wireframe fidelity — read the wireframe PNG the task cites and compare it against the diff’s component structure directly, not from the task description alone; stack conformance against tech-stack.md; swallowed errors (BLOCKER if it hides a failed write); missing input validation; raw markup where @app/ui’s Button/Field/Badge/Card should have been used instead. | High |
| R7 | Cross-Service Data Isolation | BLOCKER, no exceptions: a service importing or querying another service’s entities, repositories, or tables directly. Every backend service shares one database and schema, so nothing at the infrastructure level stops this — cross-service data must go over HTTP through a published contract instead. This is what makes "service data is private" (X5) an enforced rule rather than a comment nobody’s holding to. | Critical |

## 4. Cross-cutting — 6 policies

| # | Policy | Description | Severity |
|---|---|---|---|
| X1 | Separation of Powers | The agent that writes code never clears it. This is the one rule that cannot be dropped at any scale — remove it and every other policy becomes advisory. | Critical |
| X2 | BLOCKER Non-Waivable | A BLOCKER cannot be downgraded, deferred, or overridden by any agent or command. Only its resolution clears it. | Critical |
| X3 | Rework Cap | Three review cycles on one task, then stop and escalate to the human with both positions stated. Never force a pass to end the loop, and never loop indefinitely. | High |
| X4 | Human Owns Push/PR | Push and pull request to any remote are always yours. There is no feature-branch-per-PRD convention — /commit reaches master directly, and only when every gate is green. | Critical |
| X5 | Service Data Is Private | By convention, not infrastructure — every backend service shares one database and schema. No service reads another’s tables regardless; cross-service data goes over HTTP through a published contract. Enforced at review time by R7, since nothing physical stops the violation anymore. | Critical |
| X6 | Contracts Before Implementation | A cross-boundary type is added to shared/contracts first, then implemented against — never the reverse. Prevents duplicated types that drift silently. | High |

## 5. Definition of Done

- [ ] Every bound AC is implemented
- [ ] At least one test per AC, and each would fail if the code were wrong
- [ ] build, typecheck, lint, and test all green
- [ ] UI matches its wireframe, including loading, empty, and error states
- [ ] No hardcoded secrets; no secret logged
- [ ] Zero open BLOCKERs
- [ ] Any default taken under ambiguity is logged in DECISIONS.md

## 6. Permissions at a glance

| Actor | Writes | Bash | Git | Clears own work |
|---|---|---|---|---|
| planner | ledger + PRD moves | read-only git | branch create only | no |
| builder | src + tests | test / lint / typecheck | checkout only | never |
| reviewer | nothing | read-only runs | read-only inspect | n/a |
| `/commit` | nothing | gate suite | commit to master | — |
| human | — | — | push / PR / merge | — |

## 7. Lite vs Full

| Element | Lite | Full | Why the difference |
|---|---|---|---|
| Agents | 3 | 6 | Auditor, Estimator, Decision-Resolver have no job without profiles, capacity planning, or a routing table |
| Agent policies | 20 | 86 | 9 profile-gated are inert; 3 stack policies collapse to 1; ~55 are elaborations of ~15 real rules |
| Cross-cutting | 6 | 10 | The other 4 protect multi-app, multi-developer concerns |
| Commands | 4 | 18 | signoff, accept, defect, status, velocity, roadmap, review-batch, audit all presuppose scale |
| Pipeline stages | 6 | 15 | Sign-off, design, specialist pass, and acceptance are ceremony at this size |
| Doc folders | 3 | 11 | _INTAKE, _SIGNOFF, _CONTEXT, _DEFERRED, _LOGS, design, acceptance, defects stay empty on a small build |

Roughly 65% of the full set exists to manage coordination across apps, developers, approvers, and a regulated domain. On a single-app build with one driver, that 65% is pure overhead.

## 8. When to graduate

| Add | When |
|---|---|
| auditor + a profile | Money, PII, or multi-tenant data enters the system |
| estimator + build-log.md | You need to forecast delivery dates |
| /signoff + _SIGNOFF/ | Someone other than you approves scope |
| /accept + acceptance/ | The approver is not the person building |
| design/ stage | A schema change breaks something in production |
| decision-resolver | HOLDs need routing to different people |
