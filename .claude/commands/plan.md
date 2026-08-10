---
description: Turn a PRD and its wireframes into ordered, AC-bound tasks.
---

# /plan

Runs the **planner** agent against the PRD in `platform/docs/prd/_ACTIVE/`.

1. Read the PRD. If its acceptance criteria are not numbered and testable, **stop** and report which ones need rewriting (P1). This gate is the whole reason the rest of the loop works — do not wave it through.
2. Read `platform/docs/wireframes/<feature>/index.md` and bind each UI task to its screen (P2).
3. Check every AC maps to at least one task (P3). Report orphans and stop if any exist.
4. Write `platform/docs/task-ledger-<prd-slug>.md` — a standalone file per PRD, ordered, dependency-aware, one entry per task (P4).
5. Verify a clean working tree on `master` before writing (P5). No branch is created — everything builds directly on `master`.

If more than one PRD is sitting in `_ACTIVE/`, ask which to plan rather than guessing.

Output feeds `/build`. `/plan` stops at planning — it does not start building.
