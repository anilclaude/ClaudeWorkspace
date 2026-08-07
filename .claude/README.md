# .claude/

Scaffold configuration — not application code, not project-specific.
Everything here implements the process described in `../scaffold/`.

## Why this lives at the workspace root

Claude Code discovers `agents/` and `commands/` by looking at the project
root — it doesn't search subfolders. So even though this folder is
conceptually part of the scaffold (process, not product), it can't
physically move into `scaffold/.claude/` without breaking discovery.
See `../scaffold/README.md` for the full reasoning.

## What's here

| Folder | Holds |
|---|---|
| `agents/` | The 3 agent definitions — planner, builder, reviewer |
| `commands/` | The 4 commands — `/plan`, `/build`, `/commit`, `/wrap` |
| `skills/` | Installed skills, including `wireframes/` (scaffold-authored) plus third-party skills |
| `launch.json` | Dev-server config, so the app can be started and previewed without knowing the pnpm filter syntax. Committed — shared, unlike `settings.local.json`. |
| `settings.local.json` | Machine-local permission grants. Gitignored — not shared, not part of the scaffold. |

## Where the actual content lives

These files are kept thin on purpose. For the full policy descriptions,
severity ratings, and rationale, see:

- `../scaffold/policies/agent-policies.md` — the 25 policies these agents implement
- `../scaffold/README.md` — setup, the build loop, when to graduate
- `../scaffold/inputs/` — the tech-stack and repo-structure decisions these agents enforce
