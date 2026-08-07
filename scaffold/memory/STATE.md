# STATE

Where the build is right now. Read first every session; refresh every `/wrap`.
Keep it short — a pointer, not a history. The git log is the history.

---

**Current focus:** _Scaffold and process layer are in place; no `/plan` has run yet, so no application code exists beyond the health-check scaffold on `backend/auth` and `backend/core`. This session did the platform restructure (`backend/`, `frontend/{web,mobile}`, `shared/`, libraries segregated by consumer), wrote 8 PRDs to `platform/docs/prd/_ACTIVE/` (`login` + 7 café-app PRDs in dependency order — see each PRD's "Build order" line), built wireframes for `login` and `cafe-menu-management`, added the `wireframes` skill (`.claude/skills/wireframes/`), built a shared UI component library (`Button`/`Field`/`Badge`/`Card` in `frontend/libs/ui`), moved every backend service onto one shared database and schema (`platform_db`, namespaced `<service>_migrations` tables, entity-scoped test truncation), and removed the BFF layer — the browser now calls each service directly via CORS (`frontend/web/src/lib/services.ts`), with `scaffold/templates/` and all docs (`repo-structure.md`, `tech-stack.md`, `platform/README.md`, `BaseWorkspace_Structure_Lite` now v5) updated to match._

**Last session:** 2026-08-07 — see above. All four gates (`build`/`typecheck`/`lint`/`test`) verified green on `platform/` after the shared-DB and BFF-removal changes.

**Next up:** `login` and `cafe-access-roles` are both build-ready right now — `login` has wireframes done, `cafe-access-roles` has no UI and needs none. Run `/plan` (no argument — it reads `platform/docs/prd/_ACTIVE/` directly and asks if more than one PRD is unplanned) to start either. The other 5 café PRDs (`cafe-tables-reservations`, `cafe-order-management`, `cafe-kitchen-display`, `cafe-billing-payments`, `cafe-inventory-management`) need wireframes before they can be planned — see each PRD's own "Depends on" line for build order.

**Open HOLDs:** _None — see [DECISIONS.md](DECISIONS.md)_

**Uncommitted work:** _Yes, substantial, in both repos — this entire session's work is uncommitted. Run `git status` in both `scaffold/`'s repo (the workspace root) and `platform/`'s repo before starting anything new; do not assume a clean tree._
