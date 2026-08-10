---
description: Commit cleared work to master. Refuses unless every gate is green.
---

# /commit

Commits the cleared diff to `master` — there's no feature-branch-per-PRD convention; everything builds directly on `master` (single local machine, no remote).

## Preconditions — all required, no override

- The task's `status` is `done` in `platform/docs/task-ledger-<prd-slug>.md`
- Zero open BLOCKERs
- `build`, `typecheck`, `lint`, and `test` all run green **now**, not "passed earlier"
- **`test:int` runs green now** — and actually ran. Integration tests fail loudly rather than skipping when Postgres is unreachable (`pnpm db:up` from `platform/`), so "it errored because the database was down" is a blocked commit, not a pass. A DB-backed change whose integration tests never executed is exactly what this precondition exists to stop.

If any precondition fails, report which one and stop. There is no force flag; a gate you can skip is not a gate.

## What it does

Stages the task's files and commits with a message citing the task id and its ACs:

```
T03: password reset token single-use enforcement (AC12, AC13)
```

Records the commit hash in the ledger entry.

## What it never does

Never runs `push` or creates a PR to any remote. Never runs `rebase` or `reset`. Push and pull request stay yours whenever a remote exists — that boundary does not move.
