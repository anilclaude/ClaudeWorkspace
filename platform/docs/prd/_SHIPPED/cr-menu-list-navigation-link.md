# CR — Dashboard "Menu Management" link points to the menu list, not the add form

**Status:** completed
**Date:** 2026-08-13
**Amends:** `platform/docs/prd/_CHANGE_REQUESTS/cr-dashboard-menu-management-link.md`'s AC4 (still in `_CHANGE_REQUESTS/`, not yet shipped) — and transitively `_SHIPPED/cafe-menu-management.md`'s AC3/AC5/AC6, since the list screen (`cafe-menu-list-default`) they describe currently has no entry point from the dashboard at all.
**Build gate:** no — reverses one already-approved link target, no new screen or component.

## What's changing

Repoint the dashboard's "Menu Management" widget link from `/menu/new` to `/menu` (the existing menu list/overview screen). Adding a new item stays reachable via `/menu`'s own already-existing "+ Add Item" button — no new UI is added by this CR.

## Why

Reported as "cafe-menu-list-default screen navigation is not available in menu management." Investigated: the list screen (`/menu`) is fully built and working, but nothing in the app links to it — the dashboard's only "Menu Management" link goes straight to the add-item form (`/menu/new`), per `cr-dashboard-menu-management-link`'s original AC4. That earlier CR narrowed scope to "the add flow" without providing any way to reach the list itself. This CR closes that gap by making the primary link go to the list (the more natural landing point — matches "Menu Overview" already shown read-only on the dashboard), relying on the list screen's own add button for the create path.

## Acceptance Criteria

- AC1 — Clicking the dashboard's "Menu Management" widget navigates to `/menu` (the menu list screen), not `/menu/new`.
- AC2 — From `/menu`, the existing "+ Add Item" control still navigates to `/menu/new` — unchanged by this CR.
- AC3 — No other dashboard widget or link is altered by this CR.

## Validation Contract (optional)

- VC-CR-001: Clicking "Menu Management" on the dashboard results in the URL being `/menu`.
