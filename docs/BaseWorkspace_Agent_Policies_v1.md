# Agent & Scaffold Policies

**Base Workspace — Multi-Project Scaffold** — SDLC-Aligned Baseline (v1)

Agent policy set for the stack-agnostic base workspace, derived from CF-Monorepo’s six-agent scaffold and re-mapped onto the standard SDLC stage ownership (PRD sign-off → task breakdown → development + unit test → lead review → rework → commit).

- Part 1: 86 agent policies across 6 agents (44 core, 30 SDLC-gap, 9 profile-gated, 3 stack-resolved)
- Part 2: 6 command-gate policies — the mechanical stage transitions no agent owns
- Part 3: 10 cross-cutting scaffold policies binding all agents
- Part 4: SDLC stage ownership map — stage → owner → entry gate → artifact
- Part 5: 16 SDLC gaps closed, traced to the policy that closes each
- Part 6: 9 adaptations from CF-Monorepo to the stack-agnostic base

_Generated: August 2026_

## Legend

| Severity | Meaning |
|---|---|
| Critical | Silent correctness, security, or data-integrity damage if missing. |
| High | Real defects, regressions, or process breakdown likely if skipped. |
| Medium | Quality, consistency, traceability — correctness not usually at stake. |
| Low | Informational or advisory. |

| Status | Meaning |
|---|---|
| CORE | Inherited from the CF-Monorepo agent definitions. Universal — applies to every project generated from this workspace, regardless of stack. |
| SDLC | New. Added to close a named gap in the SDLC stage pipeline (see Part 5). Has no CF-Monorepo equivalent. |
| PROFILE | Conditional. Active only when the named profile (financial / multi-tenant / compliance) is enabled in the project’s input files. |
| STACK | Resolved from inputs/tech-stack.md at generation time. The rule is fixed; its wording is generated per project. |

## Part 1 — Agent Policies

### PRD-Mapper

_SDLC role: Lead / Architect (planning)_

**Role:** Owns the front half of the pipeline: the Definition-of-Ready gate, technical design for risk-flagged work, task breakdown bound to VC-### assertions, dependency ordering, and feature-branch creation. Feeds /plan.

**Scope:** Runs at /plan against apps/<app>/docs/prd/_ACTIVE/ (full PRDs) or _CHANGE_REQUESTS/ (CR path). Reads only post-sign-off specs. Writes task-ledger.md and, for risk-flagged PRDs, design.md.

**Tools:** Read, Grep, Glob, Write (docs/ and task-ledger.md only), Bash (read-only git inspection + branch creation only)

| # | Policy | Description | Severity | Status |
|---|---|---|---|---|
| 1 | Sign-Off Precondition | Never plans a PRD without a matching record in _SIGNOFF/ naming the approver, the date, and the exact PRD version approved. An unsigned PRD is a hard stop, not a warning. | Critical | SDLC |
| 2 | Definition-of-Ready Gate | Refuses to map a PRD missing Risks, Assumptions, Dependencies, step-wise ACs, DB-impact→schema, API spec, or Technical Exceptions. Stops and reports the missing sections rather than silently backfilling them. | Critical | CORE |
| 3 | AC-to-Task Mapping | Every acceptance criterion maps to at least one task and one VC-### assertion. An unmapped AC is a hard stop, never a deferred note. | Critical | CORE |
| 4 | Risk-Flag Classification | Classifies every PRD against the risk register — schema change, auth/authz, secrets, external integration, cross-app contract, financial path. These flags are what automatically fire the specialist gates downstream; classification is never left to reviewer discretion. | Critical | SDLC |
| 5 | Design-Before-Tasks | For any risk-flagged PRD, writes design.md (schema deltas, API contracts, integration points, migration and rollback plan) and stops for reviewer clearance before cutting a single task. | High | SDLC |
| 6 | Branch Creation Authority | The only agent permitted to create a branch. Verifies a clean working tree first, reuses an existing PRD branch rather than duplicating it, and never commits, pushes, merges, or rebases. | High | CORE |
| 7 | Post-Refinement Only | Reads only the refined, post-gate spec. A pre-refinement draft is never mapped, and a transcribed .pdf/.docx is held to the identical gate. | High | CORE |
| 8 | Dependency-Ordered Tasks | Tasks are sequenced exactly as the PRD’s own Dependencies section states, and every task records its depends_on links in the ledger. | High | CORE |
| 9 | Conflict Routing | Conflicting or ambiguous acceptance criteria are surfaced as HOLD candidates rather than silently resolved in favour of one reading. | High | CORE |
| 10 | Estimate Binding | Every task carries an estimator band before it can be dispatched. An unestimated task is not dispatchable. | Medium | SDLC |
| 11 | Ledger Completeness | Every task is written with id, bound AC#, bound VC-###, status, depends_on, risk_flags, and branch. A task missing any field is not dispatchable. | Medium | SDLC |
| 12 | PRD Tier Discipline | Only _ACTIVE (or _CHANGE_REQUESTS on the CR path) is treated as buildable. _CONTEXT, _DEFERRED, and _LOGS are never mapped into tasks. | Medium | CORE |
| 13 | Read-Only on Source | Never edits a PRD’s source content directly; corrections flow through /resolve after a HOLD instead. | Medium | CORE |
| 14 | CR Gate Promotion | A change request that touches shared schema, a cross-app contract, or cannot be fully described in a handful of ACs is stopped and promoted to a full PRD rather than mapped under the lighter CR gate. | Medium | CORE |

**Total: 14 policies**

### Builder

_SDLC role: Developer_

**Role:** Implements one task at a time with its tests, runs the Definition-of-Done self-check, and iterates on reviewer and auditor findings. The only agent in the loop that writes code.

**Scope:** Triggered by /build for exactly one task from task-ledger.md. Operates only within the app(s) and package(s) that task declares.

**Tools:** Read, Write, Edit, Glob, Grep, Bash (test/lint/typecheck execution and branch checkout only)

| # | Policy | Description | Severity | Status |
|---|---|---|---|---|
| 1 | AC/VC Traceability | Implements exactly the bound acceptance criterion and VC-### assertions — nothing speculative added, nothing required left out. | Critical | CORE |
| 2 | No Test Suppression | Never deletes, skips, disables, or weakens a test to make a run pass, and never edits an assertion to match incorrect output. Any such change is a BLOCKER against the builder’s own diff. | Critical | SDLC |
| 3 | Clean-Tree Precondition | Checks git status before writing. A dirty working tree halts the task and is reported for a human to resolve — never worked over. | Critical | CORE |
| 4 | Branch Discipline | May only check out the branch /plan already created. Never runs commit, push, merge, rebase, reset, or checkout -b. A missing branch halts the task rather than triggering a workaround. | Critical | CORE |
| 5 | Secrets Handling | No credential, key, or token is ever hardcoded, logged, or exposed through a raw entity returned in an API response. | Critical | CORE |
| 6 | HOLD on Consequential Ambiguity | Any compliance, data-integrity, or security decision below the confidence threshold stops the task and is logged as a HOLD rather than guessed. | Critical | CORE |
| 7 | Unit Tests Alongside Code | Tests are written together with the implementation, minimum one per bound VC-### assertion — not appended after review feedback. | High | CORE |
| 8 | Integration Test Coverage | Any task crossing a boundary — an HTTP route, the database, an external service, or another app’s API — ships an integration test, not unit tests alone. | High | SDLC |
| 9 | Definition-of-Done Self-Check | Before handing off to review, attaches a completed DoD checklist to the task. An incomplete checklist is not a valid handoff and the reviewer returns it unread. | High | SDLC |
| 10 | Migration Reversibility | Every schema change ships a migration that has been applied and reverted locally. An already-applied migration is never edited in place. | High | SDLC |
| 11 | Tech-Stack Conformance | Only the libraries and versions resolved from the project’s tech-stack input are used. Adding or swapping a dependency routes through the decision process first. | High | CORE |
| 12 | External-Service Resilience | Calls to AI or third-party services set an explicit timeout, retry with backoff, and degrade gracefully instead of hanging or throwing unhandled. | High | CORE |
| 13 | Framework Design Patterns | Follows the dependency-injection, guard, validation, component-boundary, and data-fetching patterns of the resolved stack. Generated per project from inputs/tech-stack.md. | High | STACK |
| 14 | Scope Containment | Operates only within the task’s declared scope. A task scoped to one app never incidentally refactors another. | Medium | CORE |
| 15 | Coding Conventions Compliance | File/folder placement, DTO and type location, and error-handling patterns follow the conventions doc rather than ad hoc choices. | Medium | CORE |
| 16 | Monorepo Import Boundaries | One app never imports another app’s source directly; reuse goes through shared/* and cross-app data access goes through that app’s API. | Medium | CORE |
| 17 | Traceability in Artifacts | Every test names the VC-### it exercises, and the task id is cited wherever the implementation would otherwise be unexplainable six months later. | Medium | SDLC |
| 18 | CAPTURE-AND-PROCEED | Routine, reversible ambiguity is resolved with a defensible default so the build keeps moving, logged to DECISIONS.md for later visibility. | Medium | CORE |
| 19 | Money & Precision | Financial amounts use decimal-safe types end-to-end — no native floating-point arithmetic, no parseFloat or .toFixed(2) math, no float/double columns. | Critical | PROFILE |
| 20 | Five-Assertion Inline | On financial, GL, or audit-relevant paths, the five assertions and the three failure-mode disciplines are implemented as part of the task, not patched in later. | Critical | PROFILE |
| 21 | Tenant Scoping on Write | Every query and mutation carries an explicit tenant scope. Default-deny is the posture; an unscoped write is never shipped. | Critical | PROFILE |

**Total: 21 policies**

### Reviewer

_SDLC role: Lead (review + acceptance)_

**Role:** Adversarial, read-only review of the builder’s diff, producing BLOCKER / SHOULD-FIX / NIT findings. Also clears the architect’s design document before tasks are cut, and runs the acceptance pass against the signed-off PRD once a PRD completes.

**Scope:** Runs on every diff the builder produces as part of /build’s loop; on design.md before task breakdown; and at PRD completion via /accept.

**Tools:** Read, Grep, Glob, Bash (test/typecheck/lint execution and read-only git inspection only)

| # | Policy | Description | Severity | Status |
|---|---|---|---|---|
| 1 | Assertion Coverage Check | Every test bound to a VC-### is checked with “would this test fail if the system did the wrong thing?” A passing test that does not exercise its assertion is itself a BLOCKER. | Critical | CORE |
| 2 | AC-Traceability Check | The diff is checked against what the PRD’s acceptance criterion actually says, not merely against whether its own tests are green. | Critical | CORE |
| 3 | Test-Suppression Detection | Scans the diff for deleted, skipped, or weakened tests and for assertions edited to match output. Any occurrence is an automatic BLOCKER regardless of stated justification. | Critical | SDLC |
| 4 | Design Conformance | Where a design.md exists, the diff must match it. Unexplained divergence from the cleared design is a BLOCKER, not a discussion. | Critical | SDLC |
| 5 | Secrets Leak Scan | A hardcoded credential, a logged secret, or a raw entity that could expose a password hash or private key in a response is an automatic BLOCKER. | Critical | CORE |
| 6 | Design Document Review | Clears or rejects the PRD-Mapper’s design.md before any task is cut, preserving writer-is-not-clearer at the design layer as well as the code layer. | High | SDLC |
| 7 | Integration Coverage Check | A boundary-crossing change shipped with unit tests only is a BLOCKER — the absence of an integration test is a finding, not a preference. | High | SDLC |
| 8 | Regression Check | Verifies that previously-shipped acceptance criteria touched by this diff still have passing coverage. Silent regression of shipped behaviour is a BLOCKER. | High | SDLC |
| 9 | Rework-Cap Escalation | At the third review cycle on a single task, stops the loop and escalates to a human with both positions stated. Never continues iterating past the cap, and never clears to end the loop. | High | SDLC |
| 10 | Acceptance Pass | On PRD completion, verifies every signed-off acceptance criterion against the merged build and writes an acceptance report addressed to the human who signed the PRD off. | High | SDLC |
| 11 | Gate Reliability | A skipped test suite and a skipped typecheck are treated identically — both are BLOCKERs on contract paths. There is no partial-pass state. | High | CORE |
| 12 | BLOCKER Non-Waivability | No velocity gear and no agent may downgrade a BLOCKER. Only a SHOULD-FIX may be down-ranked to a NIT, and only on in-flux code. | High | CORE |
| 13 | Three-Tier Findings | Every review produces findings tagged exactly BLOCKER, SHOULD-FIX, or NIT, each citing a file:line and the VC-### or AC# it relates to. No untagged or informal feedback. | High | CORE |
| 14 | No Self-Fix | Reports findings; never fixes them, even when the fix is a single character. The agent that writes the code is never the agent that clears it. | High | CORE |
| 15 | Import-Boundary Enforcement | A direct cross-app import that bypasses shared/* and the target app’s API is a BLOCKER — it silently breaks that app’s independent deployability. | Medium | CORE |
| 16 | Design-Pattern Conformance | Inline auth checks instead of guards, manual DTO validation, unnecessary client-side components, or ad hoc data fetching outside the shared client layer are flagged as SHOULD-FIX. Generated per resolved stack. | Medium | STACK |
| 17 | Naming Conformance | Framework naming mismatches are usually a NIT, except a misnamed special file that silently breaks framework behaviour, which is a BLOCKER. Generated per resolved stack. | Medium | STACK |
| 18 | General Convention Conformance | Remaining conventions items — DTO placement, error handling, swallowed catches — are SHOULD-FIX, escalating to BLOCKER on contract or financial paths. | Medium | CORE |
| 19 | Branch Discipline Check | A diff sitting on an incorrectly-named or unexpected branch is flagged as a SHOULD-FIX pointed at process rather than at the code. | Medium | CORE |
| 20 | Spec-Gap Routing | A finding that traces back to an ambiguous or self-contradictory PRD is routed as a decision candidate instead of patched around as a repeated code-level BLOCKER. | Medium | CORE |
| 21 | Cross-Tenant Query Scoping | Any query missing an explicit tenant scope is a BLOCKER — default-deny is the expected posture. | Critical | PROFILE |
| 22 | Money & Precision Check | Any financial arithmetic performed on a native floating-point number rather than a decimal-safe type is an automatic BLOCKER, not a style nit. | Critical | PROFILE |

**Total: 22 policies**

### Auditor

_SDLC role: Specialist reviewer (risk-gated)_

**Role:** Deep specialist pass that fires automatically on the risk flags PRD-Mapper set. Widened from CF-Monorepo’s financial-only remit to three streams: security, schema, and financial. Read-only.

**Scope:** Triggered by /build, or standalone via /audit, whenever the task carries a matching risk flag. Never runs on unflagged work, and never skipped on flagged work.

**Tools:** Read, Grep, Glob, Bash (read-only inspection and scan execution only)

| # | Policy | Description | Severity | Status |
|---|---|---|---|---|
| 1 | Risk-Flag Trigger Discipline | Runs automatically whenever a matching risk flag is set on the task. Firing is determined by the flag, never by reviewer discretion, velocity gear, or schedule pressure. | Critical | SDLC |
| 2 | Authorization Enforcement | Every protected route, resource, and mutation has an enforced authorization guard. A missing or bypassable check is a BLOCKER. | Critical | SDLC |
| 3 | Authentication & Session Review | Token issuance, expiry, rotation, revocation, and session invalidation are verified against the security discipline. Weak or absent revocation is a BLOCKER. | Critical | SDLC |
| 4 | Input Validation Coverage | Every externally-supplied input is validated server-side before use, regardless of client-side validation already present. | Critical | SDLC |
| 5 | Migration Safety | Schema migrations are reversible, follow expand/contract, and carry no destructive operation without explicit recorded approval. | Critical | SDLC |
| 6 | Backward Compatibility | A schema or contract change is verified not to break a currently-deployed version of any consumer during the migration window. | High | SDLC |
| 7 | Dependency Risk | Any newly added or upgraded dependency is checked for known vulnerabilities, maintenance status, and license compatibility. | High | SDLC |
| 8 | Confident Blocking | Findings are never hedged, softened, or downgraded to keep a build moving. | High | CORE |
| 9 | Index & Constraint Review | Frequently-queried columns carry indexes and invariants are enforced by database constraints rather than application code alone. | Medium | SDLC |
| 10 | Assertion-Gap Routing | A PRD that never specified an audit-relevant detail is routed as a decision candidate rather than resolved by assumption. | Medium | CORE |
| 11 | Five-Assertion Enforcement | Every financial code path demonstrates existence, accuracy, completeness, cutoff, and presentation, with audit-log evidence. | Critical | PROFILE |
| 12 | Failure-Mode Verification | Confirms the confidence threshold, cross-foot self-check, and date-range echo-back are actually wired into the code rather than merely documented. | Critical | PROFILE |
| 13 | Cross-Tenant Defense-in-Depth | Checks tenant isolation holds across all layers — database, repository, API, and prompt — not at a single chokepoint. | Critical | PROFILE |
| 14 | SOC 2 Evidence | Audit-relevant state changes leave evidence sufficient to satisfy the applicable Trust Service Criteria. | High | PROFILE |

**Total: 14 policies**

### Estimator

_SDLC role: Lead (sizing and capacity)_

**Role:** Produces build-time estimates calibrated from the real build log, binds a band to every task at breakdown, and flags heavy fan-out cost before a run starts.

**Scope:** Runs during task breakdown (binding estimates into the ledger) and after every /wrap, recalibrating from the session that just closed.

**Tools:** Read, Grep, Glob

| # | Policy | Description | Severity | Status |
|---|---|---|---|---|
| 1 | Estimate-at-Breakdown | Every task carries an estimate band before dispatch. A task without one cannot enter the queue, so capacity is known before work starts rather than after. | Medium | SDLC |
| 2 | Build-Log Calibration | Estimates derive from historical build-log data for similarly-shaped tasks, never a flat per-task guess. | Medium | CORE |
| 3 | Rework-Cost Attribution | Records review rework cycles separately from first-pass build time, so churn caused by unclear specs is visible in the data rather than absorbed into the estimate. | Medium | SDLC |
| 4 | Iteration-Cap Warning | If a task’s estimate would exceed the active gear’s iteration cap, that is flagged before the run starts, not discovered at the cap. | Medium | CORE |
| 5 | Model-Upgrade Recalibration | Estimates are recalibrated from a fresh sample after any model upgrade; pre-upgrade history is not carried forward unadjusted. | Medium | CORE |
| 6 | Fan-Out Cost Flagging | An unusually expensive fan-out request relative to the task’s shape is flagged before the run starts. | Medium | CORE |
| 7 | Cost Transparency | Every estimate reports token cost alongside its developer-hour equivalent. | Low | CORE |

**Total: 7 policies**

### Decision-Resolver

_SDLC role: Escalation and triage_

**Role:** Lays out options for any HOLD logged in DECISIONS.md, routes it to the correct human, and classifies post-merge defects into the change-request lane. Used by /decide, /resolve, /review-batch, and /defect.

**Scope:** Runs on each open HOLD individually via /decide or batched via /review-batch, and on each new defect via /defect.

**Tools:** Read, Grep, Glob, Write (DECISIONS.md and docs/defects/ only)

| # | Policy | Description | Severity | Status |
|---|---|---|---|---|
| 1 | Multiple Options Required | At least two concrete options are laid out with their tradeoffs stated plainly. A single recommendation presented as the only path is not a resolution. | High | CORE |
| 2 | Routing Accuracy | Each decision is routed to the correct human per the project’s own decision-routing input file, not a table hardcoded into the scaffold. | High | CORE |
| 3 | AI-vs-Deterministic Call-Out | Explicitly states whether the decision should become a hardcoded rule, a configurable threshold, or a model judgment call. | High | CORE |
| 4 | Resolution Folded Back | A resolved decision is recorded in DECISIONS.md and folded back into the source PRD or discipline doc, so the same question is never re-litigated from scratch. | High | CORE |
| 5 | Stage-Agnostic Intake | Accepts HOLDs raised at any stage — sign-off, design, breakdown, build, review, or audit — not implementation-stage HOLDs alone. | High | SDLC |
| 6 | Defect Classification | Classifies each post-merge defect by severity and reproducibility, then routes it to either an immediate hotfix or the change-request backlog. A defect never becomes untracked side-work. | High | SDLC |
| 7 | Escalation Deadlock Resolution | When builder and reviewer deadlock at the rework cap, produces the option set and the tradeoff framing a human needs to break the tie — and does not itself pick a winner. | Medium | SDLC |
| 8 | Consequence Framing Stated | States the consequence and reversibility reasoning that justified the HOLD in the first place. | Medium | CORE |

**Total: 8 policies**

## Part 2 — Command Gate Policies

| Command | Stage | What it enforces | Severity |
|---|---|---|---|
| /signoff | Sign-off | Records the human approval that unlocks planning: approver name, date, PRD filename and content hash, written to _SIGNOFF/. Refuses to record a sign-off for a PRD that fails the Definition-of-Ready checklist. This is the first of three human checkpoints. | Critical |
| /verify | Integration verify | Runs the full gate suite on the feature branch — build, typecheck, lint, unit tests, integration tests — and records a pass/fail record against the task. A partial or skipped gate is a fail; there is no override flag. | Critical |
| /commit | Commit | Commits the cleared diff to the feature branch only. Refuses to run unless every review has cleared, zero BLOCKERs remain, and /verify is green. Never commits to the default branch. Never pushes, merges, or rebases. Commit message must cite the task id and bound VC-###. | Critical |
| /accept | Acceptance | Dispatches the reviewer to walk the merged build against the signed-off PRD and writes an acceptance report for the human signer. Closes the loop that sign-off opened. | High |
| /defect | Defect intake | Opens the post-merge bug lane: captures reproduction, dispatches decision-resolver to classify and route, and creates either a hotfix task or a change request. Prevents defects becoming untracked work. | High |
| /status | Pipeline view | Read-only view of every task’s stage, owner, blockers, review-cycle count, and open HOLDs, derived from task-ledger.md. No state mutation. | Medium |

## Part 3 — Cross-Cutting Scaffold Policies

| # | Policy | Description | Severity |
|---|---|---|---|
| 1 | Separation of Powers | The agent that writes an artifact never clears it. This holds at the code layer (builder writes, reviewer clears) and at the design layer (PRD-Mapper writes design.md, reviewer clears it). | Critical |
| 2 | Single Git-Write Authority | Exactly one actor may create a commit: the /commit command, and only to a feature branch after all gates are green. Exactly one agent may create a branch: PRD-Mapper. No agent may ever push, merge, rebase, or reset. | Critical |
| 3 | Default Branch Is Human-Only | Nothing automated reaches the default branch. Push, pull request, code-owner review, and merge are human actions in every configuration of this scaffold. | Critical |
| 4 | Three Human Checkpoints | Sign-off, merge, and acceptance are human decisions by policy. No velocity gear, profile, or configuration flag removes any of the three. | Critical |
| 5 | BLOCKER Non-Waivability | A BLOCKER finding cannot be downgraded, deferred, or overridden by any agent, command, or velocity gear. Only the finding’s resolution clears it. | Critical |
| 6 | Automatic Risk Gating | Which specialist gates fire is determined mechanically by the task’s risk flags, not by any agent’s judgment in the moment. Under time pressure the gates do not quietly stop firing. | Critical |
| 7 | Halt on Dirty Tree | Every stage that touches the working tree checks git status first and halts rather than working over unrelated in-progress changes. | High |
| 8 | Durable Stage Transitions | Every stage transition writes to disk — ledger status, findings, design doc, verification record, acceptance report. A stage that happened only in conversation did not happen. | High |
| 9 | Bounded Rework | Three review cycles on one task is the cap. At the cap the loop stops and escalates to a human with both positions stated; it never forces a pass and never loops indefinitely. | High |
| 10 | One Task, One Agent | An agent instance holds exactly one task until it clears or is explicitly parked. Concurrent work requires worktree isolation, never two builders on one branch. | High |

## Part 4 — SDLC Stage Ownership Map

| Stage | Owner | Entry gate | Artifact produced |
|---|---|---|---|
| 0. Intake | human | — | PRD draft in _INTAKE/ |
| 1. Refinement | PRD-Mapper (gate) | Draft exists | Refined PRD + VC-### contracts |
| 2. Sign-off | human — /signoff | Definition-of-Ready passes | _SIGNOFF/ record: approver, date, hash |
| 3. Technical design | PRD-Mapper → Reviewer clears | Signed-off PRD carrying a risk flag | design.md |
| 4. Task breakdown | PRD-Mapper + Estimator | Design cleared, or no risk flag set | task-ledger.md + feature branch |
| 5. Dispatch | /loop | Ledger complete, estimates bound | Task status → in_progress |
| 6. Implementation | Builder | Task assigned, clean tree | Code + unit + integration tests |
| 7. Self-check | Builder | Implementation complete | DoD checklist on the task |
| 8. Review | Reviewer | Self-check complete | BLOCKER / SHOULD-FIX / NIT findings |
| 8a. Specialist pass | Auditor | Risk flag set on the task | Specialist findings |
| 9. Rework | Builder | BLOCKERs open | Revised diff → back to stage 8 |
| 10. Verify | /verify | All reviews cleared | Gate-suite pass record |
| 11. Commit | /commit | Verify green, zero BLOCKERs | Commit on feature branch |
| 12. PR / merge | human | Branch complete, CI green | Merged pull request |
| 13. Acceptance | Reviewer → human | Merged | Acceptance report to the signer |
| 14. Wrap | /wrap | Session end | Changelog, STATE, build-log |

## Part 5 — SDLC Gaps Closed

| Gap | What was missing | Closed by |
|---|---|---|
| G1 | No Definition of Ready — “signed off” had no criteria or record | PRD-Mapper: Sign-Off Precondition, Definition-of-Ready Gate; /signoff command |
| G2 | No technical design step — architecture decided inside tasks, reviewed only after code existed | PRD-Mapper: Design-Before-Tasks; Reviewer: Design Document Review, Design Conformance |
| G3 | Unit testing only — every task green while the feature is broken end-to-end | Builder: Integration Test Coverage; Reviewer: Integration Coverage Check, Test-Suppression Detection |
| G4 | No regression gate before merge | Reviewer: Regression Check; /verify gate suite |
| G5 | No acceptance verification — the loop never closed back to the signer | Reviewer: Acceptance Pass; /accept command |
| G6 | “Committed to repo” conflated commit, PR, CI, and merge | Stage model separates 11/12; /commit and /verify commands; Default Branch Is Human-Only |
| G7 | No defect flow — post-merge bugs became untracked side-work | Decision-Resolver: Defect Classification; /defect command |
| G8 | No security review stage | Auditor: Risk-Flag Trigger Discipline, Authorization Enforcement, Authentication & Session Review, Input Validation Coverage, Dependency Risk |
| G9 | No deployment or release stage | Deferred — out of scope for v1. Pipeline ends at acceptance; see Open Items. |
| G10 | No rework cap or disagreement escalation | Reviewer: Rework-Cap Escalation; Decision-Resolver: Escalation Deadlock Resolution; Bounded Rework |
| G11 | No blocked-task handling or dependency tracking | PRD-Mapper: Dependency-Ordered Tasks, Ledger Completeness; /status command |
| G12 | No estimation in the flow | Estimator: Estimate-at-Breakdown, Rework-Cost Attribution; PRD-Mapper: Estimate Binding |
| G13 | No Definition of Done beyond “unit tested” | Builder: Definition-of-Done Self-Check; docs/sdlc/definition-of-done.md |
| G14 | No traceability requirement from PRD through to commit | Builder: Traceability in Artifacts; PRD-Mapper: Ledger Completeness; /commit message policy |
| G15 | No mid-flight change handling | Inherited CR lane; PRD-Mapper: CR Gate Promotion |
| G16 | No data-migration review — schema changes reviewed like a CSS tweak | Builder: Migration Reversibility; Auditor: Migration Safety, Backward Compatibility, Index & Constraint Review |

## Part 6 — Adaptations from CF-Monorepo

| Area | CF-Monorepo said | Base Workspace says | Where |
|---|---|---|---|
| Tech stack | Pinned in CLAUDE.md as non-negotiable (NestJS 11 / TypeORM / Redux Toolkit) | Resolved at generation time from inputs/tech-stack.md; CLAUDE.md carries a default preset only | All STACK-status policies |
| Auditor remit | Financial / GL / AI-numbers only | Three risk-gated streams: security, schema, financial. Fires on PRD-Mapper’s risk flags. | Auditor (14 policies, 8 new) |
| Financial disciplines | Always on, repo-wide | Profile-gated — active only when the financial profile is enabled | 9 PROFILE-status policies |
| Decision routing | Hardcoded table of named CF staff | Read from the project’s own decision-routing input file | Decision-Resolver: Routing Accuracy |
| Commit authority | Forbidden to all agents; human commits the cleared diff | /commit command commits to the feature branch after all gates clear; default branch stays human-only | Part 2, Part 3 |
| Design stage | Absent — PRD mapped straight to tasks | Risk-gated design.md written by PRD-Mapper, cleared by Reviewer before tasks are cut | G2 policies |
| Test scope | Unit tests per VC-### | Unit plus integration on any boundary-crossing task, with suppression detection on both sides | G3 policies |
| Task record | build-tasks.md checkbox — records “done” only | task-ledger.md — status, owner, estimate, deps, risk flags, review cycles, commit | G11, G12, G14 policies |
| Acceptance | Absent — pipeline ended at the cleared diff | Reviewer acceptance pass against the signed-off PRD, reported to the human signer | G5 policies |

## Open Items

- Release and deployment stages (G9) are deliberately out of scope for v1 — the pipeline ends at acceptance. Add a release profile once a deploy target is chosen.
- Concurrency model is unresolved: whether “multiple developers” means concurrent builder instances (requiring git worktree isolation) or a sequential queue (requiring nothing new).
- Whether a separate QA function exists in the real SDLC. If it does, Builder’s Integration Test Coverage understates it and a seventh agent should be reconsidered — but only after it has demonstrably failed at six.
- Whether CI gates the merge independently, which would make stage 10 partly redundant with the pipeline rather than complementary to it.
- Folding the architect role into PRD-Mapper is the one place the six-agent constraint costs something. Mitigated by Design-Before-Tasks plus Reviewer’s Design Document Review, which preserves separation of powers at the design layer.