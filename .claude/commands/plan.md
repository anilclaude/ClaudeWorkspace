---
description: Turn a PRD and its wireframes into ordered, AC-bound tasks, and create the feature branch.
---

# /plan

Runs the **planner** agent against the PRD in `platform/docs/prd/_ACTIVE/`.

1. Read the PRD. If its acceptance criteria are not numbered and testable, **stop** and report which ones need rewriting (P1). This gate is the whole reason the rest of the loop works — do not wave it through.
2. Read `platform/docs/wireframes/<feature>/index.md` and bind each UI task to its screen (P2).
3. Check every AC maps to at least one task (P3). Report orphans and stop if any exist.
4. Write `platform/docs/task-ledger.md` — ordered, dependency-aware, one entry per task (P4).
5. Verify a clean working tree, then create `feature/<prd-slug>` off the default branch (P5).

If more than one PRD is sitting in `_ACTIVE/`, ask which to plan rather than guessing.

Output feeds `/build`. `/plan` stops at planning — it does not start building.
