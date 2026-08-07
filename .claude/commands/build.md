---
description: Run the build → review → rework loop on the next task from the ledger.
---

# /build

Runs the core loop for the next `status: ready` task in `platform/docs/task-ledger.md`.

1. **builder** checks out the feature branch (halting on a dirty tree or missing branch), implements the task with tests, and runs `build`, `typecheck`, `lint`, and `test` locally. Sets `status: in_review`.
2. **For any task touching UI**: start the dev server, open the built screen in a browser, and screenshot it. Compare side by side against the wireframe PNG the task cites. Neither the builder nor the reviewer subagent can do this themselves — the builder has no browser tool, and the reviewer is read-only by design — so this step runs in the orchestrating session, between the builder and reviewer passes. Note any visual drift as a finding for the next reviewer pass rather than fixing it silently.
3. **reviewer** reads the diff and produces BLOCKER / SHOULD-FIX / NIT findings. Read-only — it never edits code and never touches git state.
4. **builder** addresses every BLOCKER, then SHOULD-FIX where reasonable. Increment `review_cycles`.
5. Repeat from step 2 (re-screenshot after any UI change) until zero BLOCKERs remain.
6. Set `status: done` in the ledger.

**Rework cap:** at the third cycle on one task, stop and escalate with both positions stated. Never force a pass to end the loop.

Nothing is committed. When the loop clears, the diff sits uncommitted on the feature branch — run `/commit` when you're ready.

Pass a task id (`/build T03`) to run a specific task instead of the next ready one.

## Gate commands

All four run from `platform/`:

```bash
cd platform && pnpm build && pnpm typecheck && pnpm lint && pnpm test
```
