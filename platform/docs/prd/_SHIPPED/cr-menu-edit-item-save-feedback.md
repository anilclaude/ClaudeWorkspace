# CR — Success feedback on the Edit Menu Item form

**Status:** completed
**Date:** 2026-08-13
**Amends:** `platform/docs/prd/_CHANGE_REQUESTS/cr-menu-item-save-feedback.md` (still in `_CHANGE_REQUESTS/`, not yet shipped) — that CR's own text explicitly excluded edit mode ("edit mode's own save-feedback is a related but separate gap, not included here"). This CR closes that gap.
**Build gate:** no — reuses the already-built, already-reviewed success-banner mechanism from the CR above; no new pattern.

## What's changing

After a successful `PATCH /menu/items/:id` on the Edit Menu Item form, show a success message (e.g. "`<item name>` updated"), styled and behaving exactly like the existing add-mode success banner (`cr-menu-item-save-feedback`). The form stays on-screen afterward, same as it already does today.

## Why

Reported as "Edit menu is also giving error." Investigated live via a clean, un-contaminated flow (real in-app navigation, not a hard reload): the `PATCH` genuinely succeeds — 200 OK, the change persists — but the form gives zero visual feedback, indistinguishable from a silent failure. This is the exact same missing-feedback pattern the Add screen had, and which `cr-menu-item-save-feedback` fixed for `'add'` mode only, deliberately leaving `'edit'` mode's identical gap noted but unfixed. This CR closes it using the same mechanism, not a new one.

## Acceptance Criteria

- AC1 — After a successful save on the Edit Menu Item form, a visible success message appears (e.g. "`<Item name>` updated"), styled consistently with the add-mode success banner (and the form's existing failure banners).
- AC2 — The success message is specific to a successful save — it does not appear on initial load of the edit screen, and clears when the user starts an unrelated subsequent edit (mirrors `cr-menu-item-save-feedback`'s AC2 exactly, applied to the edit form's own field `onChange` handlers).
- AC3 — The existing failure path (`SUBMIT_ERROR_MESSAGE`) and the availability-toggle's own separate success/failure behavior are unchanged by this CR.

## Validation Contract (optional)

- VC-CR-001: Given a successful `PATCH /menu/items/:id` response, the success message renders with the item's name in it, not a generic, indistinguishable state.
