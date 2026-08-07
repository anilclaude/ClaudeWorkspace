---
description: Run the build → review → rework loop on the next task from the ledger.
---

# /build

Runs the core loop for the next `status: ready` task in `platform/backend/<service>/docs/task-ledger.md`.

1. **builder** checks out the feature branch (halting on a dirty tree or missing branch), implements the task with tests, and runs `build`, `typecheck`, `lint`, and `test` locally. Sets `status: in_review`.
2. **reviewer** reads the diff and produces BLOCKER / SHOULD-FIX / NIT findings. Read-only — it never edits code and never touches git state.
3. **builder** addresses every BLOCKER, then SHOULD-FIX where reasonable. Increment `review_cycles`.
4. Repeat from step 2 until zero BLOCKERs remain.
5. Set `status: done` in the ledger.

**Rework cap:** at the third cycle on one task, stop and escalate with both positions stated. Never force a pass to end the loop.

Nothing is committed. When the loop clears, the diff sits uncommitted on the feature branch — run `/commit` when you're ready.

Pass a task id (`/build T03`) to run a specific task instead of the next ready one.

## Gate commands

All four run from `platform/`:

```bash
cd platform && pnpm build && pnpm typecheck && pnpm lint && pnpm test
```
