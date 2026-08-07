---
description: Commit cleared work to the feature branch. Refuses unless every gate is green.
---

# /commit

Commits the cleared diff to the **feature branch only**.

## Preconditions — all required, no override

- The task's `status` is `done` in `platform/docs/task-ledger.md`
- Zero open BLOCKERs
- `build`, `typecheck`, `lint`, and `test` all run green **now**, not "passed earlier"
- **`test:int` runs green now** — and actually ran. Integration tests fail loudly rather than skipping when Postgres is unreachable (`pnpm db:up` from `platform/`), so "it errored because the database was down" is a blocked commit, not a pass. A DB-backed change whose integration tests never executed is exactly what this precondition exists to stop.
- The current branch is not the default branch

If any precondition fails, report which one and stop. There is no force flag; a gate you can skip is not a gate.

## What it does

Stages the task's files and commits with a message citing the task id and its ACs:

```
T03: password reset token single-use enforcement (AC12, AC13)
```

Records the commit hash in the ledger entry.

## What it never does

Never commits to the default branch. Never runs `push`, `merge`, `rebase`, or `reset`. Push, pull request, and merge are yours — that boundary does not move.
