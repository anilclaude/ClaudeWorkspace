# 2026-08-13 — Changelog folder setup

**Prompt:** "I want to log all these change requests prompt and change description. We can create the same folder structure from C:\Users\hp\OneDrive\Desktop\CF-Workspace\CF-Monorepo\apps\client\docs, do evaluate"

## What changed
- Added `scaffold/memory/changelog/` — one dated markdown file per change request (prompt + what changed + why), instead of one growing log.
- Added `scaffold/memory/changelog/README.md` documenting the convention and its relationship to `DECISIONS.md`/`build-trace.md`.

## Why
- User wanted a record of what was asked and what changed, separate from the HOLD/decision log and the build-timing log — neither of those is indexed by "what did I ask for."
- Modeled on `CF-Monorepo/apps/client/docs/changelog/`'s pattern (one dated file per entry), adapted: scoped to prompt+change rather than PRD-spec-diff, homed at `scaffold/memory/` instead of a per-app docs folder since this workspace is single-app, not a multi-app monorepo.
- Scope decided via two clarifying questions: log only prompts that produced a real change (not pure Q&A), and start forward-only rather than backfilling this session — everything before this point stays fully covered by `DECISIONS.md`, `build-trace.md`, and git commit messages.

## Related
- DECISIONS.md: none (reversible process/tooling choice, not a spec ambiguity)
- Commit: not yet committed
