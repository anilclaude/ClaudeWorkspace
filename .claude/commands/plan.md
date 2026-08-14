---
description: Turn a PRD and its wireframes into ordered, AC-bound tasks. Pass `cr` for a lighter-weight change request instead of a full PRD.
---

# /plan [cr ["<description>" | <filename>]]

Runs the **planner** agent against the PRD in `platform/docs/prd/_ACTIVE/`. Pass `cr` to target `platform/docs/prd/_CHANGE_REQUESTS/` instead — see "The `cr` argument" below.

1. Read the PRD. If its acceptance criteria are not numbered and testable, **stop** and report which ones need rewriting (P1). This gate is the whole reason the rest of the loop works — do not wave it through.
2. Read `platform/docs/wireframes/<feature>/index.md` and bind each UI task to its screen (P2).
3. Check every AC maps to at least one task (P3). Report orphans and stop if any exist.
4. Write `platform/docs/taskplanned/task-ledger-<prd-slug>.md` — a standalone file per PRD, ordered, dependency-aware, one entry per task (P4).
5. Verify a clean working tree on `master` before writing (P5). No branch is created — everything builds directly on `master`.

If more than one PRD is sitting in `_ACTIVE/`, ask which to plan rather than guessing.

Output feeds `/build`. `/plan` stops at planning — it does not start building.

## The `cr` argument — change requests

`/plan cr [...]` runs the planner against `platform/docs/prd/_CHANGE_REQUESTS/` instead of `_ACTIVE/`, applying P7's lighter gate in place of P1-P3's full checklist. See `_CHANGE_REQUESTS/README.md` for the full convention.

**Create or map:**
- `/plan cr "<inline description>"` — auto-creates a new CR file (`_CHANGE_REQUESTS/cr-<slug>.md`) from the description, following the CR template (P7), flagging rather than inventing anything the template needs that the description doesn't state.
- `/plan cr <filename>` — maps an existing file already sitting in `_CHANGE_REQUESTS/`.
- Bare `/plan cr` — if exactly one CR file has no ledger yet, map it. If more than one is unmapped, list them and ask which. If none exist, say so and suggest `/plan cr "<description>"`.

Steps 2-5 above (wireframe binding, AC coverage, ledger write, clean tree) still apply unchanged to a CR that clears P7 — a UI-touching CR still cites the existing feature's wireframe `index.md` (P2); most CRs won't touch UI at all.

Writes `platform/docs/taskplanned/task-ledger-cr-<slug>.md` — same YAML shape as a PRD ledger.

**If P7 can't clear the CR** (it needs more analysis than the lighter gate covers): stop before writing a ledger, log a HOLD in `scaffold/memory/DECISIONS.md` (`Task: <cr-slug> (planning)`, same convention as a PRD-planning HOLD), set the CR's `Status:` to `escalated`, and leave the file in place in `_CHANGE_REQUESTS/` — do not move, rename, or rewrite it. Promotion to a full `_ACTIVE/` PRD is a human decision.

**Auto-chain into `/build` — the one place `/plan` doesn't stop at planning.** Once the CR's ledger is written, immediately continue into `/build cr-<slug>`, passing the slug explicitly so `/build`'s multi-ledger "ask which to build" prompt never fires even if other PRDs also have `ready` tasks. The tree left dirty by the CR file + ledger write is expected — B4's halt guards against foreign in-progress changes, not the immediately preceding step's own output.

**Unless the CR carries `**Build gate:** yes`.** Map it, write the ledger, report that it is held for review, and stop. Do not continue into `/build`, and do not read the absence of a further instruction as approval.
