---
description: End-of-session close-out — refresh STATE.md so the next session can orient in seconds.
---

# /wrap

Run at the end of every session, including short ones. The memory loop only compounds if every session closes it out.

1. **Refresh `scaffold/memory/STATE.md`** — current focus, what this session did, what's next, open HOLDs. This is the file the next session reads first; if it's stale, the next session starts by re-reading everything.
2. **Check the ledger.** If every task under a PRD is `done`, move that PRD from `platform/docs/prd/_ACTIVE/` to `platform/docs/prd/_SHIPPED/` and clear its tasks from the ledger. Same check for a CR ledger (`task-ledger-cr-<slug>.md`): if every task is `done`, move the CR file from `platform/docs/prd/_CHANGE_REQUESTS/` to `platform/docs/prd/_SHIPPED/` (flat — same folder a shipped PRD lands in), flip its `Status:` field from `open` to `completed`, and delete its ledger file. Locate the source file by checking which folder actually contains a file matching the ledger's slug — never by pattern-matching a `cr-` prefix in the ledger filename, so a PRD that happens to be named starting with `cr-` is never misrouted.
3. **Check `scaffold/memory/DECISIONS.md`** — any HOLD resolved this session gets its resolution recorded. Any default taken under B8 that turned out to matter gets promoted to a note in the PRD or `scaffold/inputs/tech-stack.md`, so it isn't re-decided next time.
4. **Report uncommitted work.** Any diff still sitting uncommitted on `master` is yours to review and push — `/wrap` never commits or pushes.

Keep `scaffold/memory/STATE.md` short. It is a pointer, not a history — the git log is the history.
