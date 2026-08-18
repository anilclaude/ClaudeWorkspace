# Café Menu Management — wireframes

Source: _(link to the design file — Figma/Excalidraw/whatever is the source of truth)_
PRD: [`docs/prd/_ACTIVE/cafe-menu-management.md`](../../prd/_ACTIVE/cafe-menu-management.md)
Status: Active

## Screens

| Screen | File | Implements | State shown |
|---|---|---|---|
| Admin menu list | `cafe-menu-list-default.png` | AC3, AC4, AC5, AC6 | default |
| Add item form | `cafe-menu-add-default.png` | AC1, AC5 | default (empty) |
| Add item form, validation errors | `cafe-menu-add-error.png` | AC1, AC2 | error |

Each PNG carries its ACs in the right-hand gutter, so the binding is visible in the image as well as in this table.

## Responsive intent

Desktop-first — this is an internal admin screen, not customer-facing. Below `768px` the two-column field layout in the Add Item form stacks to one column; the list view's price/status/edit columns compress by dropping the Edit label to an icon.

## Empty state

Not drawn. When no categories or items exist yet, the list card shows a centered prompt — "No menu items yet" with the same "+ Add Item" button — replacing the category sections. No AC in the PRD requires this specifically; included here as a builder note rather than a wireframed screen, per B7's rule that a screen with no empty state is not done.

## States not drawn

- **Editing an existing item** — reuses `cafe-menu-add-default.png` / `cafe-menu-add-error.png` pre-filled with the item's current values. Not wireframed separately since the layout is identical to Add.
- **Category management (add/reorder categories)** — AC6 requires categories to be reorderable, but the reordering UI itself (drag handles, up/down controls) isn't wireframed. Flagging this as a gap for the builder to raise as a HOLD or a reasonable default (e.g. drag-to-reorder) rather than silently picking one.
- **Deleting a category with items still in it** — not specified in the PRD; not wireframed. The builder should treat this as an open question rather than guess.

## Notes for the builder

- The Unavailable badge in `cafe-menu-list-default.png` is deliberately shown alongside Available ones in the same list — that's AC3's requirement (still visible to admin) rendered concretely, not an oversight.
- The photo field is optional per the PRD (only name, category, price are marked required with `*`) — don't add a validation error for a missing photo.
