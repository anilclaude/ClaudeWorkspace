# CR — Success feedback on the Add Menu Item form

**Status:** completed
**Date:** 2026-08-13
**Amends:** `platform/docs/prd/_SHIPPED/cafe-menu-management.md` (T09's `add-menu-item-form.tsx` — has an error banner for the failure path, none for success).
**Build gate:** no — additive-only, low risk.

## What's changing

After a successful `POST /menu/items`, show a success message/banner (mirroring the form's existing error-banner styling) and confirm the item was saved. The form stays on-screen afterward (not an auto-redirect to `/menu`), so an admin adding several items in a row isn't bounced away each time.

## Why

Reported as "Save Item button is not working." Investigated live: the save genuinely succeeds — confirmed the item exists via a direct API check after submitting. The actual bug is that the form gives **zero feedback** on success — it silently resets to empty, indistinguishable from a failure. This CR closes that gap; it does not change the save behavior itself, which already works.

## Acceptance Criteria

- AC1 — After a successful save, a visible success message appears (e.g. "<Item name> added" or similar), styled consistently with the form's existing error banner.
- AC2 — The success message is specific to a successful save — it does not appear on page load, and clears/doesn't persist across an unrelated subsequent action (e.g. starting to fill the form again).
- AC3 — The failure path (existing `SUBMIT_ERROR_MESSAGE` banner) is unchanged by this CR.

## Validation Contract (optional)

- VC-CR-001: Given a successful `POST /menu/items` response, the success message renders with the item's name in it (or equivalent confirmation text) — not a generic, indistinguishable state.
