# Traceability feature — change log

Running record of every change made to the build-traceability system
(`platform/docs/build-trace.md`, `.claude/agents/builder.md`'s "Trace
logging"/"Gate scope" sections, `.claude/commands/build.md`), in the order
they happened. Kept separately from `scaffold/memory/DECISIONS.md` (which is
for PRD/build decisions, not for this meta-feature) so the whole evolution
can be consolidated into one write-up later without re-deriving it from the
session transcript.

---

1. **Initial design.** Added `platform/docs/build-trace.md` (append-only
   table: timestamp, task id, task summary, step, detail) plus two
   checkpoints in `builder.md` (`builder:start`, `builder:submit_for_review`)
   and one orchestrator-side step in `build.md` (log the reviewer's verdict,
   since the reviewer agent is read-only and can't write files itself).
   Reason: user wanted to measure and optimize build/review time.

2. **Every row carries task id + title**, not id alone — so the trace file
   reads standalone without cross-referencing `task-ledger.md`.

3. **Broke `builder:implementation_done` into phases** — `context_read`,
   `tests_written`, `gates_start`, `gates_passed` — so reading time,
   implementation time, test-writing time, and gate-fixing time are each a
   separately measurable duration instead of one lump.

4. **Broke "code written" into per-file rows** — `builder:file_written`,
   one row per file with the file path as `detail`, replacing a single
   fixed-name checkpoint. Reason: code composition varies too much per task
   (backend-only, UI-only, mixed) for fixed category names to fit every
   task; per-file rows show which specific file ate the most time, for any
   task shape. Noted tradeoff: one more Write call per file, forever, on
   every future build — accepted for now while actively optimizing.

5. **`rework_complete` also gets its own `file_written` rows** for any file
   touched during rework, so rework time-per-file is visible too, not just
   lumped into one rework duration.

6. **Gate scope tightened**: builder now runs gates scoped to the touched
   package(s) (`pnpm --filter <package> ...`) instead of the full monorepo
   four-gate command. Reason: T01 showed the builder running both scoped
   *and* full gates (ambiguous original instruction), and `/commit` already
   re-runs the full four-gate suite as its own precondition regardless — so
   the full run on every task was pure redundancy, not extra safety.

7. **Timestamp accuracy bug found and fixed.** Cross-checking T01/T02's
   self-reported trace timestamps against the harness's actual measured
   `Agent` call durations showed the self-reported numbers were badly
   inflated — e.g. T01 claimed an 18-minute gate run inside a build agent
   call that only ran 5.2 minutes total, which is impossible. Root cause:
   builders were estimating plausible-sounding timestamps instead of
   reading the real clock, despite an earlier soft instruction to "use the
   real clock." Fix: replaced the soft instruction with a mechanical rule in
   `builder.md`, `build.md`, and `build-trace.md`'s own header — run
   `date -u +"%Y-%m-%dT%H:%M:%SZ"` as its own separate tool call immediately
   before every single row write, no exceptions, never pattern-matched or
   estimated. T01/T02's absolute durations are flagged as unreliable in
   `build-trace.md`'s header; T03 was close to accurate; T04 onward should
   be fully trustworthy under the new rule.

8. **Ordering slip caught in T04's own trace** (after the mechanical timestamp
   fix landed): the orchestrating session logged `done` before the builder's
   final `rework_complete` row had actually landed in the file, because the
   orchestrator edited based on a `Read` taken slightly before the builder's
   last write completed. Timestamps were both accurate (real `date` calls on
   both sides), but row *order* still went wrong. Fixed by hand. Lesson: even
   with real timestamps, the orchestrator must re-`Read` the trace file
   immediately before each of its own appends, not rely on an earlier read
   in the same turn — append-only files being written by two actors
   (orchestrator + subagent) can still interleave unexpectedly.

9. **Verified the timestamp fix worked, with real evidence.** T03/T04's
   self-reported spans (13m24s, 13m34s) landed within ~1 minute of the
   harness's actual measured agent durations (12.5min, 12.6min) — a huge
   improvement over T01/T02's 29-43 minutes of pure fabrication. Confirmed
   the mechanical rule fixed the accuracy problem it was meant to fix.

10. **New checkpoint added ad hoc**: `orchestrator:screenshot_verification`,
    used on T05 (the first UI task) when the screenshot tool turned out to
    be unavailable in this environment. Not pre-planned — added in the
    moment to record that verification was attempted and what happened
    instead (a real scaffold bug was found and fixed: Tailwind v4 wasn't
    scanning the `@app/ui` workspace package, so shared-component classes
    were silently dropped from compiled CSS). Not yet formalized into
    `builder.md`/`build.md`'s documented checkpoint list — worth doing if
    more UI tasks hit the same tooling gap.

11. **Process gap flagged by the reviewer, not yet acted on**: the
    `globals.css` scaffold-bug fix was made directly by the orchestrating
    session during T05's verification step, not routed through a builder
    task. The reviewer's point: this bypassed the loop's own review
    discipline the first time around (only caught retroactively, by the
    reviewer reading it after the fact) and the fix initially shipped with
    no regression test. A follow-up builder task closed the test gap, but
    the underlying process question — should the orchestrator ever
    write source code directly, even for a fix found during its own
    verification step — is still open. Current answer, not formalized
    anywhere: no, route it through a (possibly trivial) builder task
    instead, even when the orchestrator already knows the fix.

12. **Deep evaluation pass after 5 tasks** (user request: "evaluate if any
    additional steps... or repetitive work... which can be done at last").
    Pulled real per-task numbers from the harness (`Agent` tool's
    `duration_ms`/`tool_uses`, not self-reported trace rows) across
    T01-T05: 610 tool calls, ~63 real minutes. Found two genuine, actionable
    inefficiencies (not just perception):
    - **Reviewer duplicating the builder's gate run every cycle.** T02's
      reviewer re-ran `test:int` three separate times on top of the full
      scoped gate suite, despite the builder having already reported green
      seconds earlier with nothing changed in between.
    - **Trace logging itself was ~15-20% of total tool calls**, partly from
      one `date`+`Edit` round-trip per single file, even when multiple files
      finished in the same second (T03 already showed this — 4 files, one
      timestamp, no lost information from batching).
    Also considered and explicitly rejected: batching the *screenshot
    verification* step across multiple UI tasks instead of doing it per-task
    — would break the tight build→review loop (a later task's BLOCKER could
    invalidate an earlier task's now-unverified assumption), so kept per-task.

13. **Both findings acted on immediately** (user: "go ahead with change #1
    and #2"):
    - `reviewer.md` — added a "trust the builder's reported gate results by
      default" rule under Permissions; only re-run a gate (or a narrower
      targeted command) when there's a specific reason to distrust the
      report, and say why when doing so.
    - `builder.md` + `build-trace.md` header — `file_written` logging is now
      batched: one `date` call + one `Edit` covering all files finished in a
      short burst, instead of one round-trip per file. Only split into a new
      `date`+`Edit` pair when real time visibly passed between files.

14. **Both changes validated immediately on T06**: reviewer explicitly
    logged "gates trusted, not re-run" and finished in 21 tool calls (down
    from 33-37 in T01-T04). Confirms #1 is working as intended, not just
    theoretically sound.

15. **New environmental finding during T07's live verification, not a
    trace-system change but worth recording alongside the others**: running
    a builder's scoped `pnpm --filter @app/web build` (production build)
    while the orchestrator's `next dev` preview server is concurrently
    running on the same `.next` directory corrupts Turbopack's HMR state
    (`TurbopackInternalError: Cell ... no longer exists`, followed by the
    dev server auto-deleting and rebuilding `.next/dev`). Symptom: live
    browser verification silently serves a stale bundle — edits (including
    debug `console.log`s added to diagnose the very problem) never reach
    the browser, with no visible error. Root-caused by fetching the served
    JS chunk and grepping for an expected string that should have been
    there. Fix applied twice in T07's verification: `preview_stop` +
    `rm -rf .next` + `preview_start` before re-testing. Not yet formalized
    into any process doc — should become a standing step ("restart the
    preview server fresh before live-verifying any task, if a builder ran
    `build` since it was last started") rather than something rediscovered
    per incident.

16. **Formalized the `orchestrator:live_verification_start`/`_end`
    checkpoint** in `build-trace.md`'s header and `build.md`'s step 2 (user
    request: make T07-style live-verification time visible in the trace
    instead of an untracked gap between `submit_for_review`/`reviewer:cycle_N`
    and whatever comes next).

17. **Token-usage evaluation** (user request, analysis only, no changes made
    at the time): pulled real per-call token counts from all 7 tasks'
    `Agent` invocations — ~1.2M subagent tokens total (T01: 127.8k, T02:
    123.1k, T03: 172.0k, T04: 149.7k, T05: 179.0k, T06: 115.6k, T07: 332.4k
    — the last driven by two real bugs, not waste). Found one genuine,
    actionable duplication: the orchestrator's own dispatch prompts were
    restating policy text (`builder.md`'s Gate scope, Trace logging's
    mechanical timestamp rule) that the subagent is *also* told to read
    directly — same text paid for twice, no benefit. Two other candidates
    considered and explicitly rejected as not worth acting on: reviewer/
    builder re-reading their policy files on every dispatch (structural
    cost of the separation-of-powers design, not removable without giving
    up independent subagent memory), and wireframe images being read by
    both builder and reviewer independently (the mechanism that makes R6
    fidelity review meaningful, not waste). Flagged `DECISIONS.md`/
    `task-ledger.md` growth as a compounding-but-not-yet-urgent cost — worth
    revisiting once past `login` into the café PRDs, not now at 32 rows.

18. **Dispatch-prompt trimming applied** (user: "apply #1... and log this
    decision"). Added a "Dispatch prompts stay terse" note to `build.md`,
    right after the rework-cap line: reference `builder.md`/`reviewer.md`
    sections by name ("per Gate scope", "per Trace logging's mechanical
    rule") instead of restating their text inline. Task-specific context
    (which files matter, what the AC requires, what prior tasks already
    built) stays in the prompt in full — only the already-documented policy
    text gets trimmed. This is a change to *how the orchestrating session
    writes future dispatch prompts*, not a file both subagents read, so
    there's no single place to verify it "took" other than watching future
    dispatch prompts actually get shorter — worth spot-checking on T08's
    dispatch.

19. **Added a `Tokens` column to `build-trace.md`** (user: "add that... dont
    start next task, and log this decision"). Populated by the orchestrator
    only, on two row types — the only two places a token total is actually
    known at write time:
    - `reviewer:cycle_N` rows (already orchestrator-written) — the review
      call's own total goes directly in the Tokens column.
    - A new `orchestrator:tokens` row, appended immediately after a
      builder's `submit_for_review` or `rework_complete` row — since the
      builder writes those *during* its run, before the call's total token
      count is known; only the orchestrator sees that number, and only
      after the call fully returns. Detail = which phase it closes out
      (`build` or `rework`).
    Every other row leaves Tokens blank — this is a per-call total, not a
    per-step breakdown (the harness doesn't report finer granularity than
    one number per whole `Agent` call). Backfilled accurate values for all
    of T01-T07 using the real numbers already known from this session's own
    token-usage evaluation (#17) — 21 values, summing to 1,199,546, which
    matches that evaluation's total exactly (cross-checked via a script,
    not just visually). Also bulk-added a blank trailing cell to every
    pre-existing row (115 rows, via `sed`) so the table stayed well-formed
    after the header gained the new column.

---

**Open item, not yet acted on:** whether `gates_start`→`gates_passed` should
be split further into a clean-run duration vs. a `builder:gates_retry`
checkpoint (fix-and-rerun time), so trace analysis can separate "gates ran
clean" from "debugging a gate failure." Deferred per the 2026-08-09 decision
to gather 2-3 more tasks of varied shape (backend/DB, UI+wireframe) before
tuning further, rather than optimizing off a single contracts-only task.
This has now been gathered (T02 backend/DB, T05 UI+wireframe) — revisit.
