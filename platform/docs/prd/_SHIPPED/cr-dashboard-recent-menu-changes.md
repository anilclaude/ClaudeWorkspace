# CR — Recent Menu Changes: show the 5 most recently changed items

**Status:** completed
**Date:** 2026-08-14
**Amends:** `platform/docs/prd/_CHANGE_REQUESTS/cr-dashboard-menu-management-link.md`'s AC6 (superseded — see that file's own note under AC6).
**Build gate:** no — purely a client-side derivation over data (`GET /menu/items`) already being fetched for the dashboard's KPI cards; no new endpoint, no new contract field.

## What's changing

The "Recent Menu Changes" card on `/dashboard` currently always shows "No recent activity," regardless of real menu activity. This CR makes it show the 5 most recently created-or-edited menu items, each with its name, whether it was added or updated, and when.

## Why

User-requested: "Recent Menu Changes should show first 5 latest changes." The card's original permanent-empty design (`cr-dashboard-menu-management-link` AC6) was based on "no activity/audit-log data source exists in this codebase" — true for a full audit log (no per-field diff, no "who changed it," no delete history), but not true for "which items changed most recently": every `MenuItem` already carries `createdAt`/`updatedAt`, and the dashboard already fetches the full item list for its KPI cards. This CR uses that already-available data rather than fabricating anything or building a new audit-log subsystem.

## Acceptance Criteria

- AC1 — "Recent Menu Changes" lists up to 5 items, sorted by most recent change (`updatedAt`) descending — the single most recently created-or-edited item first.
- AC2 — Each entry shows the item's name, whether it was added or updated (an item whose `createdAt` equals its `updatedAt` has never been edited since creation — shown as "added"; otherwise "updated"), and a timestamp.
- AC3 — With zero menu items, the card still shows "No recent activity" (now a genuine empty state, not a permanent one).
- AC4 — This does not claim to be a full audit log: no field-level diff ("price changed from X to Y"), no record of deletions, no "changed by" attribution — only which items were most recently created or edited, derived from existing timestamps.

## Validation Contract (optional)

- VC-CR-001: Given a set of items with distinct `updatedAt` values, the rendered list order matches `updatedAt` descending, capped at 5 entries even if more items exist.
- VC-CR-002: An item where `createdAt === updatedAt` renders as "added"; an item where `updatedAt > createdAt` renders as "updated".
