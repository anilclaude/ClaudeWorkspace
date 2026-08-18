# CR — Populate the Category dropdown on the Add Menu Item screen

**Status:** completed
**Date:** 2026-08-13
**Amends:** `cafe-menu-management` (`_SHIPPED/cafe-menu-management.md`) — the Add Menu Item form's `add`-mode Category `<select>`, T08/T09's placeholder-only default.
**Build gate:** no — same fetch pattern already proven three times in this codebase (list screen, dashboard, edit screen), no new risk or ambiguity.

## What's changing

`/menu/new`'s Category dropdown currently only ever shows the disabled "Select category" placeholder — it never fetches or lists real categories, so an admin cannot actually pick one when adding a new item. Fetch `GET /menu/categories` and populate the dropdown with real options, the same way the edit screen (`EditMenuItemScreen`) already does for its own Category dropdown.

## Why

Found by hand in the running app: the Category field is required (AC1/AC5 of `cafe-menu-management`), but with no real options an admin can never actually save a new item. This was a known, explicitly logged gap since T08/T09 (`scaffold/memory/DECISIONS.md`, "cafe-menu-management T08"/"(T08 review escalation resolution)") — T10 closed it for the list screen and T11 closed it for the edit screen, but the add flow itself was never revisited.

## Acceptance Criteria

- AC1 — On `/menu/new`, the Category dropdown lists every real category from `GET /menu/categories` (name as the visible label, id as the value) instead of only the placeholder.
- AC2 — Selecting a category and submitting a valid form successfully creates the item with that `categoryId` (end-to-end — the field was already wired to state, only the visible options were missing).

## Validation Contract (optional)

- VC-CR-001: Given `GET /menu/categories` returns N categories, the Category `<select>` on `/menu/new` renders exactly N real `<option>` elements (plus the placeholder), not zero.
