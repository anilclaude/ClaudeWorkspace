# STATE

Where the build is right now. Read first every session; refresh every `/wrap`.
Keep it short — a pointer, not a history. The git log is the history.

---

**Current focus:** _Two of eight café-suite PRDs are shipped (`cafe-access-roles`
T00-T03, `cafe-menu-management` T01-T11), both committed to `platform/` `master`.
`login` (T01-T11) is fully built and all its tasks are `done`, but its PRD file
deliberately stays in `platform/docs/prd/_ACTIVE/` rather than `_SHIPPED/` — see
Open HOLDs below. The CR (Change Request) mechanism was added this session and
used for its first eleven real CRs — a dashboard screen, session/logout handling,
and several menu-management UX fixes — all now shipped to `_SHIPPED/`, their task
ledgers cleared. Five café PRDs remain unbuilt and need wireframes before `/plan`:
`cafe-tables-reservations`, `cafe-order-management`, `cafe-kitchen-display`,
`cafe-billing-payments`, `cafe-inventory-management` — see each PRD's own
"Depends on" line for build order._

**Last session:** 2026-08-13/14 — added the CR mechanism (`docs/prd/_CHANGE_REQUESTS/`,
planner's P7 gate, `/plan cr`, `/wrap`'s CR-shipping step) and used it for eleven
real CRs, all built through the full plan→build→review loop and live-verified in
the browser: a real `/dashboard` screen with a working Menu Management link
(later repointed from `/menu/new` to `/menu`), removing AppShell's duplicate
chrome from the dashboard, populating the Add/Edit Menu Item category dropdown,
moving the session token from `localStorage` to an in-memory Redux store, a
working logout control + back arrow on every authenticated screen, success
banners on the Add/Edit Menu Item forms (previously silent saves read as "not
working"), a shared `useRequireSession` guard so all four protected screens
redirect to `/login` on a lost session instead of showing a generic fetch-error
banner, the dashboard showing the real signed-in user's identity/date instead of
hardcoded mock text with left-nav items enabled-but-inert instead of disabled,
and "Recent Menu Changes" showing the 5 most recently added/updated items instead
of a permanent empty state. All eleven CR ledgers are `done`, zero open BLOCKERs;
`build`/`typecheck`/`lint`/`test`/`test:int` all re-run green immediately before
committing (`platform/` `96b534d`/`4682c16`; outer scaffold repo `1c6f2ce`).

**Open HOLDs:**
- `login` — session-expiry banner (`docs/wireframes/login/index.md`'s "States not
  drawn") has no bound AC/task; a `DECISIONS.md` entry ("T11 (reviewer
  escalation)") explicitly gates this **before the PRD is considered fully
  shipped** — needs a planning decision (add a task now that `/dashboard` has
  real shape, or confirm out of scope and update the wireframe doc). This is why
  `login.md` still stays in `_ACTIVE/` despite every one of its tasks being
  `done` — re-confirmed this session's `/wrap`, not re-litigated.
- `cafe-menu-management` — AC6's reorder-*trigger* control (drag handles / up-down
  arrows) has no wireframe and was never built anywhere (backend persistence and
  the display-reflects-order half both exist and work). Needs a wireframe before
  a task can be planned for it. Logged as OPEN in `DECISIONS.md`
  ("cafe-menu-management (planning)") — archived anyway since every
  currently-planned task is done; this is accepted scope, not a defect.
- Two lower-priority, non-gating notes for future café PRDs, both in
  `DECISIONS.md`: `cafe-access-roles` T03's `require-role-policy.cjs` lint check
  only catches same-*method* `@Public()`+`@RequireRoles()` conflicts, not
  same-*class* (not currently exploitable, revisit when a controller first uses a
  class-level decorator); `cafe-menu-management`'s `MenuItem.price` stays a raw
  `z.number()` (float drift risk once Order Management sums totals off this
  shape — flagged for that PRD's planning pass, not fixed here).

**Uncommitted work:** _Yes, one repo._
- **`platform/`**: this `/wrap`'s own archival moves — the eleven CR files moved
  `_CHANGE_REQUESTS/` → `_SHIPPED/` (`Status: open` → `completed`) and their
  eleven task ledgers deleted. `login.md`/`task-ledger-login.md` were touched and
  reverted in the same pass (see Open HOLDs above) — no net change there.
  Everything else in `platform/` is committed through `4682c16`.
- **Outer scaffold repo**: clean, committed through `1c6f2ce`.
