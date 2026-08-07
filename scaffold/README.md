# scaffold/

Everything about **how** work gets done. No product code lives here, ever.

**3 agents · 26 policies · 4 commands · 6 stages.** Sized for a small team with
one person driving a build at a time.

| Folder | Holds |
|---|---|
| `inputs/` | `tech-stack.md` and `repo-structure.md` — the two files that decide stack and shape. Committed; they are the generation record. |
| `policies/` | The 22 agent policies. |
| `memory/` | `STATE.md` (read first each session) and `DECISIONS.md`. |
| `templates/` | Skeletons copied when adding a service or a module. |

Agent and command definitions live at `../.claude/` rather than here, because
Claude Code discovers them at the project root. They are kept thin and point
back at this directory for content.

The product lives in `../platform/`. The separation is the point: this folder
changes when the *process* improves, `platform/` changes when the *product* does.

---

## Starting a new project from this workspace

There is no separate template to copy — **this workspace is the template**, and
it is the version that provably builds and passes all four gates. A hand-kept
copy would drift the first time the real one improved.

1. **Clone `platform/`** into the new project, then delete
   `docs/prd/_ACTIVE/*` and any service or app you don't need.
2. **Copy `scaffold/` and `../.claude/`** across, and clear `memory/STATE.md`
   and `memory/DECISIONS.md` back to their empty headings.
3. **Rename the package scope.** `@app/*` → your own, in every `package.json`
   and every import. Recorded in `inputs/repo-structure.md`.
4. **Fill in `inputs/tech-stack.md`.** Every row, pinned versions. Nothing
   downstream works properly until this is done.
5. **Verify the gates on the empty scaffold** — `cd platform && pnpm build &&
   pnpm typecheck && pnpm lint && pnpm test`. All four must pass *before* the
   first feature exists. If they don't, the reviewer has nothing to enforce and
   "tests pass" means nothing for the life of the project. This is the
   prerequisite people skip and cannot fix cheaply later.
   Full setup sequence — env files, Postgres, migrations: [`../platform/README.md`](../platform/README.md).
6. **Fill in the root `CLAUDE.md`** — project name, description, service list.
7. **Write the first PRD** into `platform/docs/prd/_ACTIVE/`, following that
   folder's `README.md`. Numbered, testable ACs. PRDs live at the platform
   level, not inside any one service or app, since a single PRD routinely
   produces tasks in more than one of them.
8. **Export wireframes** into `platform/docs/wireframes/<feature>/` with an
   `index.md` mapping screens to ACs.
9. **Run `/plan`.**

## The loop

```
PRD → /plan → /build (implement → review → rework) → /commit → /wrap
```

## The two things that decide whether this works

**Numbered, testable acceptance criteria.** Everything hangs off them — tasks
bind to them, tests cite them, the reviewer checks against them. Prose
requirements are the single most common reason these builds go wrong.

**Wireframes in the repo as images, with an `index.md` mapping screens to ACs.**
A design-tool link alone is not readable at build time.

## Adding a service

Copy `templates/backend-service/` rather than hand-copying an existing
service — see that folder's own README for the full checklist. Four things in
short: the folder, a free port, `migrationsTableName` set identically in all
three files that need it (the template already has the placeholder in each —
that's the whole reason to start from it rather than a manual copy), and a
`shared/contracts/src/<name>/` entry for anything it publishes. No new
database — every service shares `platform_db`.

Adding a module inside an existing service: `templates/backend-module/`.
Adding a frontend feature: `templates/frontend-module/`.

## When to graduate

Add these back only when the trigger actually fires — adding a policy before its
failure mode exists is how a scaffold gets heavy.

| Add | When |
|---|---|
| `auditor` agent + profile | Money, PII, or multi-tenant data enters |
| `estimator` + `build-log.md` | You need to forecast delivery dates |
| `/signoff` + `_SIGNOFF/` | Someone other than you approves scope |
| `/accept` + `acceptance/` | The approver is not the person building |
| Design stage + `design/` | A schema change breaks something in production |
| `decision-resolver` | HOLDs need routing to different people |
| Message broker | A genuine async workflow appears between services |

The full-scale versions of all of these are described in
`../docs/BaseWorkspace_Agent_Policies_v1` and `../docs/BaseWorkspace_Structure_v1`.
