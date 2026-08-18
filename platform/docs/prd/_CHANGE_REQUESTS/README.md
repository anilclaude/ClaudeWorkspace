# _CHANGE_REQUESTS

Small amendments/fixes against **already-shipped** behavior — a lighter-weight sibling to `_ACTIVE/`, not a replacement for it. A brand-new feature story still goes through the full PRD path (`_ACTIVE/`); a CR is for something small enough that writing a full PRD would be disproportionate to the change itself.

## What qualifies as a CR vs. a full PRD

A CR is appropriate when the change:

- Amends behavior an already-`_SHIPPED/` PRD (or CR) established — a config toggle, a copy tweak, a validation-rule adjustment, a small new field on an existing endpoint — **and**
- Can be fully described in a few sentences plus a handful of numbered, testable Acceptance Criteria — if it can't, it's not small, and belongs in `_ACTIVE/` as a real PRD instead.

If planning a CR surfaces that it actually needs more (it touches shared schema/contracts in a way that needs its own risk analysis, or can't be described in a handful of ACs), the planner stops and flags it as needing promotion to a full PRD rather than silently building an under-specified change — see "Escalation" below.

## The gate, but lighter

Unlike `_ACTIVE/`, a CR does not need a Data Entities or Out of Scope section. It needs only:

- **What's changing** — plain description.
- **Amends** — which `_SHIPPED/` file and AC# it's changing (or "net-new" for something genuinely additive that still doesn't warrant a full PRD).
- **Acceptance Criteria** — same numbered, testable, step-wise bar as a full PRD's ACs, usually 1-3 of them instead of a dozen.
- **Validation Contract** (optional) — one or more `VC-CR-###` assertions, a separate numbering namespace from any PRD's own `VC-###`, so a CR's checks never collide with or get confused for the PRD it amends.

## Entry format

Filename: `cr-<slug>.md`

```markdown
# CR — <short title>

**Status:** open          <!-- open | escalated | completed -->
**Date:** <ISO date>
**Amends:** <path to the _SHIPPED/ file + AC#, or "net-new">
**Build gate:** no         <!-- or: yes — <what needs approval before code is written> -->

## What's changing
<description>

## Why
<the reason/request behind it>

## Acceptance Criteria
- AC1 — <numbered, testable>

## Validation Contract (optional)
- VC-CR-001: <testable, implementation-agnostic assertion>
```

`Status` starts `open`. Once every task under this CR's ledger (`platform/docs/taskplanned/task-ledger-cr-<slug>.md`) is `done`, `/wrap` moves the file from here to `_SHIPPED/` (flat — the same folder a shipped PRD lands in) and flips `Status` to `completed` in the same step. Nothing is left behind in this folder once a CR completes; `_SHIPPED/` is the durable record from that point on.

## Build gate

A CR may carry an explicit **build gate**: `**Build gate:** yes` plus a short note on what needs approval. If set, `/plan cr` maps the CR, writes its ledger, reports that it is held for review, and **stops** — it does not continue into `/build`, and the absence of a further instruction is never read as approval. Use this for anything touching money, auth, or other sensitive-but-technically-small behavior, where a cheap human double-check on the Acceptance Criteria is worth the pause before code gets written. Default is `no` — most CRs auto-chain straight into `/build`.

## Creating one

`/plan cr "<short description>"` auto-creates a new CR `.md` here from that inline description. Alternatively, drop a `.md` file directly into this folder yourself, then run `/plan cr <filename>` to map it. Either path auto-chains into `/build` immediately after planning (unless the build gate above is set) — CRs are small enough that "plan it, then separately remember to build it" is unneeded friction. This is the one place `/plan` doesn't stop at planning.

Only `.md` is accepted — unlike a full PRD, there's no `.pdf`/`.docx` transcription step in this scaffold.

## Escalation

If a CR turns out to need real risk/dependency analysis after all, the planner stops before writing a ledger, logs a HOLD in `scaffold/memory/DECISIONS.md`, and sets `Status: escalated` on the CR file — it stays in this folder, untouched, until a human decides to promote it into a full PRD in `_ACTIVE/`. Once that PRD is written and the HOLD resolved, the escalated CR file is deleted (its content is now superseded) and the fold-in is noted in the DECISIONS.md resolution.

## What doesn't belong here

- A brand-new feature with real scope beyond a handful of ACs — that's a full PRD in `_ACTIVE/`.
- A correction to an `_ACTIVE` PRD's own text before it's ever shipped — that's just editing the PRD directly, not a CR (a CR amends *shipped* behavior).
