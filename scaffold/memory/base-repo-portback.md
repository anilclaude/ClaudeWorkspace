# Base-repo portback log

Process-level fixes made to this workspace's `.claude/` config that are generic
(not specific to the `login` PRD or any one task) and should be ported back to
the base/template repo next time it's synced. Kept separately from
`DECISIONS.md` (which is for PRD-scoped defaults, not scaffold-process fixes)
so this list can be worked through as its own checklist later.

---

1. **Dev server vs. gate builds (frontend/web only).** Added to
   `.claude/commands/build.md`, after step 1 ("Dev server vs. gate builds"
   paragraph): before dispatching the builder for any step that runs gates on
   `frontend/web` (initial build in step 1, or rework in step 5), stop the
   preview dev server if one is running — a live `next dev` process and a
   concurrent `pnpm --filter @app/web build` corrupt each other's `.next`
   cache (Turbopack HMR errors, or a stale bundle served silently with no
   visible error). Restart fresh (`rm -rf frontend/web/.next` first) before
   the next live-verification step. Root cause and its repeated cost across
   tasks are documented in `scaffold/memory/traceability-changelog.md` (#15)
   and the T07/T08 rows in `platform/docs/build-trace.md`; this rule replaces
   the ad hoc stop/rm/restart cleanup those tasks needed *after* hitting the
   corruption with a rule applied *before* dispatching the builder. Generic to
   any Next.js app in a monorepo with a concurrently-running dev server — not
   specific to this PRD, and not specific to this workspace.

2. **Same-tick dispatch test pattern for duplicate-invocation guards.** Added
   to `.claude/agents/builder.md` under B2 ("Test Per AC"): any test for a
   guard against a duplicate synchronous invocation (double-click,
   double-submit) must dispatch both invocations in the same tick via raw
   events (e.g. two `dispatchEvent` calls before an `await act()` flush), not
   two separate `fireEvent`/`act()` calls — `fireEvent` wraps each call in its
   own `act()`, which flushes React state between the two dispatches and
   hides the exact race the guard exists to prevent. Found via T09: a
   `useState`-based double-submit guard passed its own `fireEvent`-based test
   green while letting two real requests through under a real synchronous
   double-click live, caught only by live verification (see T09's rows in
   `platform/docs/build-trace.md`). Generic to any React (or similarly
   batched-state-update) frontend — not specific to `login` or this PRD.

---

Both are already in effect in this workspace as of 2026-08-10. This entry
exists purely so they aren't lost/re-derived when the base repo is next
synced from this one.
