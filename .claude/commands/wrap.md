---
description: End-of-session close-out — refresh STATE.md so the next session can orient in seconds.
---

# /wrap

Run at the end of every session, including short ones. The memory loop only compounds if every session closes it out.

1. **Refresh `scaffold/memory/STATE.md`** — current focus, what this session did, what's next, open HOLDs. This is the file the next session reads first; if it's stale, the next session starts by re-reading everything.
2. **Check the ledger.** If every task under a PRD is `done`, move that PRD from `platform/backend/<service>/docs/prd/_ACTIVE/` to `platform/backend/<service>/docs/prd/_SHIPPED/` and clear its tasks from the ledger.
3. **Check `scaffold/memory/DECISIONS.md`** — any HOLD resolved this session gets its resolution recorded. Any default taken under B8 that turned out to matter gets promoted to a note in the PRD or `scaffold/inputs/tech-stack.md`, so it isn't re-decided next time.
4. **Report uncommitted work.** Any diff still sitting on a feature branch is yours to review and push — `/wrap` never commits or pushes.

Keep `scaffold/memory/STATE.md` short. It is a pointer, not a history — the git log is the history.
