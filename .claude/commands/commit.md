---
description: Commit cleared work to the feature branch. Refuses unless every gate is green.
---

# /commit

Commits the cleared diff to the **feature branch only**.

## Preconditions — all required, no override

- The task's `status` is `done` in `platform/backend/<service>/docs/task-ledger.md`
- Zero open BLOCKERs
- `build`, `typecheck`, `lint`, and `test` all run green **now**, not "passed earlier"
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
