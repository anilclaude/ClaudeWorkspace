# Café — Inventory Management

**Build order: 6 of 7 (last).** Depends on: `cafe-menu-management`, `cafe-kitchen-display`.

Wireframes: `platform/docs/wireframes/cafe-inventory-management/` *(to be added before `/plan`)*

## 1. What we're building

Track ingredient stock and automatically deduct it as food is prepared, so Admin staff always know what's on hand. This is the last PRD in the sequence because it's the only one that needs two prior pieces: Menu (to attach a recipe to) and Kitchen (whose Ready transition is the deduction trigger).

## 2. User stories

- US1 — As an Admin, I can list ingredients with a unit (kg, litre, piece) and how much is currently in stock.
- US2 — As an Admin, I can attach a "recipe" to a menu item — which ingredients it uses, and how much of each.
- US3 — As the system, stock is automatically reduced when a kitchen item is marked Ready, based on its recipe.
- US4 — As an Admin, I'm alerted when an ingredient drops below its reorder level.
- US5 — As an Admin, I can manually adjust stock (a delivery arrived, something was wasted) with a reason.

## 3. Acceptance criteria

- AC1 — An ingredient requires a name and a unit of measure; its quantity on hand can never go negative.
- AC2 — A menu item can list any number of ingredients, each with a quantity required per serving.
- AC3 — Marking an order item Ready deducts each linked ingredient by (recipe quantity × order quantity).
- AC4 — That deduction happens exactly once per item — marking Ready twice does not deduct stock twice.
- AC5 — An ingredient appears on the low-stock list only when it is below its reorder level, and disappears once restocked above it.
- AC6 — Every manual stock adjustment requires a reason and records who made it, when, and the before/after quantity.

## 4. Validation Contracts

- VC-001 — An ingredient's `quantity_on_hand` write is rejected if it would go negative.
- VC-002 — Marking an order item Ready triggers exactly one inventory deduction per linked ingredient, idempotent on repeated calls for the same item (satisfies AC4).
- VC-003 — An ingredient enters the low-stock list the instant its quantity crosses below `reorder_level`, and leaves it the instant it crosses back above.
- VC-004 — A manual stock adjustment is rejected if `reason` or `staff_id` is missing.
- VC-005 — A stock adjustment request is rejected for any role other than Admin (built on `cafe-access-roles`' guard).

## 5. Technical details

| Decision | Detail |
|---|---|
| Backend | `backend/cafe/src/modules/inventory/` — subscribes to the Kitchen module's Ready-transition event as an in-process call within `backend/cafe`, not a network call |
| Frontend | `frontend/web/src/modules/inventory/` |
| Contracts | `shared/contracts/src/cafe/inventory.ts` — `Ingredient`, `InventoryTransaction` |

## 6. Integration across modules

Depends on `menu_items` (Menu PRD) for what a recipe attaches to, and on the Ready-status transition (Kitchen PRD) as the sole deduction trigger — inventory is never deducted at order-creation time, only at confirmed preparation.

## 7. Database tables

**ingredients**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | required |
| unit | text | kg / litre / piece |
| quantity_on_hand | numeric(10,3) | never negative |
| reorder_level | numeric(10,3) | |

**menu_item_ingredients** *(the recipe)*
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| menu_item_id | uuid | FK → menu_items |
| ingredient_id | uuid | FK → ingredients |
| quantity_required | numeric(10,3) | per one serving |

**inventory_transactions**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| ingredient_id | uuid | FK → ingredients |
| change_qty | numeric(10,3) | negative = deduction |
| reason | enum | order_deduction / restock / wastage / manual_adjustment |
| reference_order_item_id | uuid, nullable | set when reason = order_deduction |
| staff_id | uuid | required |
| notes | text, nullable | required for wastage/manual_adjustment |
| created_at | timestamp | |

## 8. Out of scope

- Purchase ordering / supplier management
- Recipe costing or food-cost percentage analysis
- Batch/expiry-date tracking
