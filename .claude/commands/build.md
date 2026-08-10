---
description: Run the build → review → rework loop on the next task from the ledger.
---

# /build

Runs the core loop for the next `status: ready` task in `platform/docs/task-ledger.md`.

1. **builder** checks out the feature branch (halting on a dirty tree or missing branch), implements the task with tests, and runs `build`, `typecheck`, `lint`, and `test` **scoped to the package(s) touched** (`pnpm --filter <package> ...` — see `builder.md`'s "Gate scope" note; the full four-gate command is a `/commit`-time check, not repeated per task). Sets `status: in_review`. Logs each checkpoint to `platform/docs/build-trace.md` as it happens — `start`, `context_read`, one `file_written` row per file, `tests_written`, `gates_start`, `gates_passed`, `submit_for_review` (see `builder.md`'s "Trace logging" section and that file's header for the row shape).
2. **For any task touching UI (or otherwise needing a live check, e.g. an actual API round-trip)**: start the dev server, open the built screen in a browser, and screenshot it (or otherwise verify live). Compare side by side against the wireframe PNG the task cites. Neither the builder nor the reviewer subagent can do this themselves — the builder has no browser tool, and the reviewer is read-only by design — so this step runs in the orchestrating session, between the builder and reviewer passes. Note any visual drift as a finding for the next reviewer pass rather than fixing it silently. Log `orchestrator:live_verification_start` before beginning and `orchestrator:live_verification_end` after finishing (detail = what was checked and the outcome) — see `build-trace.md`'s header for the row shape. If verification surfaces a real bug, fix it through its own builder dispatch (with a regression test), not directly — same discipline as any other finding.
3. **reviewer** reads the diff and produces BLOCKER / SHOULD-FIX / NIT findings. Read-only — it never edits code, never touches git state, and never writes files.
4. **Orchestrating session** appends the reviewer's verdict to `platform/docs/build-trace.md` immediately after the reviewer pass returns — step `reviewer:cycle_N` (N = the cycle number), detail = a one-line summary of the findings (e.g. "2 BLOCKER, 1 SHOULD-FIX" or "clear"). This is done here, not by the reviewer agent, since it cannot write files. Same mechanical rule as the builder's trace rows applies here too: run `date -u +"%Y-%m-%dT%H:%M:%SZ"` as its own tool call immediately before writing the row, every time — never estimate or reuse a timestamp seen earlier in the transcript.
5. **builder** addresses every BLOCKER, then SHOULD-FIX where reasonable. Increment `review_cycles`. Logs `builder:rework_complete` to the trace file.
6. Repeat from step 2 (re-screenshot after any UI change) until zero BLOCKERs remain.
7. Set `status: done` in the ledger. Orchestrating session appends a final `done` row to the trace file, timestamped the same way (real `date` call first).

**Dev server vs. gate builds (frontend/web only):** before dispatching the builder for any step that will run gates on `frontend/web` (the initial build in step 1, or rework in step 5), stop the preview dev server if one is running — a live `next dev` process and a concurrent `pnpm --filter @app/web build` corrupt each other's `.next` cache (Turbopack HMR errors, or a stale bundle served silently with no visible error). When step 2's live verification needs the dev server again, remove `.next` (`rm -rf frontend/web/.next`) and start it fresh rather than reusing whatever was left running. This is a standing rule applied *before* dispatching the builder, replacing the ad hoc stop/rm/restart cleanup earlier tasks needed *after* hitting the corruption.

**Rework cap:** at the third cycle on one task, stop and escalate with both positions stated. Never force a pass to end the loop.

**Dispatch prompts stay terse.** The builder/reviewer subagents are told to read `builder.md`/`reviewer.md` first — don't also restate their policy text (Gate scope, Trace logging's mechanical timestamp rule, etc.) inline in the dispatch prompt. Reference the section by name instead ("per Gate scope", "per Trace logging's mechanical rule"). Task-specific context (which files matter, what the AC actually requires, what prior tasks already built) still belongs in the prompt in full — only the already-documented policy text should be trimmed.

Nothing is committed. When the loop clears, the diff sits uncommitted on the feature branch — run `/commit` when you're ready.

Pass a task id (`/build T03`) to run a specific task instead of the next ready one.

## Gate commands

All four run from `platform/`:

```bash
cd platform && pnpm build && pnpm typecheck && pnpm lint && pnpm test
```
