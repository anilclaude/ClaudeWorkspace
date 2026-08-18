# Café — Order Management

**Build order: 4 of 7.** Depends on: `cafe-menu-management`, `cafe-tables-reservations`, `cafe-access-roles`.

Wireframes: `platform/docs/wireframes/cafe-order-management/` *(to be added before `/plan`)*

## 1. What we're building

The core transaction of the app: taking an order, for dine-in, takeaway, or delivery, and tracking its items through to the kitchen. This is the hinge PRD — Kitchen Display and Billing (PRDs 5a/5b) can't start until this ships.

## 2. User stories

- US1 — As a Waiter, I can start a new order for dine-in, takeaway, or delivery.
- US2 — As a Waiter, I can add items to an order with a quantity and a note (e.g. "no onions").
- US3 — As a Waiter, I can add more items to an order that's already gone to the kitchen (a guest orders dessert after their meal).
- US4 — As a Manager, I can cancel an item from an order before the kitchen starts making it, with a reason.

## 3. Acceptance criteria

- AC1 — An order requires a type: dine-in, takeaway, or delivery.
- AC2 — A dine-in order requires a table; takeaway and delivery orders do not.
- AC3 — Opening a dine-in order sets its table to Occupied immediately.
- AC4 — Billing and closing an order sets its table back to Free immediately.
- AC5 — Every order item has a quantity of at least 1; a note is optional.
- AC6 — Adding items to an order already sent to the kitchen creates a new round sent to the kitchen — it does not silently merge into what's already cooking.
- AC7 — Items can be added to an order any time before its bill is finalized.
- AC8 — An item cannot be cancelled once the kitchen has marked it Preparing, unless a Manager overrides it.
- AC9 — Every cancellation requires a reason and records which staff member cancelled it.

## 4. Validation Contracts

- VC-001 — An order with type `dine_in` and no `table_id` is rejected.
- VC-002 — Opening a dine-in order updates the referenced table to Occupied in the same transaction — a failed order-open never leaves a table falsely Occupied.
- VC-003 — Closing/billing an order updates its table back to Free in the same transaction.
- VC-004 — Sending a second round of items to an already-in-kitchen order is recorded as a distinct, separately query-able batch, not merged into the first.
- VC-005 — Cancelling an item with status `preparing` or later is rejected unless the request carries a Manager-role override (built on `cafe-access-roles`' guard).
- VC-006 — Every cancellation write includes a non-null `reason` and `cancelled_by_staff_id`.

## 5. Technical details

| Decision | Detail |
|---|---|
| Backend | `backend/cafe/src/modules/orders/` |
| Frontend | `frontend/web/src/modules/orders/` |
| Contracts | `shared/contracts/src/cafe/orders.ts` — `Order`, `OrderItem` |
| Menu reference | Order items store a **snapshot** of the item's name and price at order time — not a live reference — so a later menu price change never rewrites a historical order |

## 6. Integration across modules

Reads `menu_items` (Menu PRD) and `restaurant_tables` (Tables PRD) by id. Is read by Kitchen Display (PRD 5a) and Billing (PRD 5b), both of which depend on `order_items` existing before they can be built. Table status transitions (Occupied/Free) are owned here, not in the Tables PRD, since this is the module that actually triggers them.

## 7. Database tables

**orders**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| order_number | text | unique, human-readable |
| order_type | enum | dine_in / takeaway / delivery |
| table_id | uuid, nullable | required only for dine_in |
| status | enum | open / in_kitchen / ready / served / billed / cancelled |
| staff_id | uuid | who opened it |
| created_at / updated_at | timestamp | |

**order_items**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| order_id | uuid | FK → orders |
| menu_item_id | uuid | FK → menu_items |
| item_name_snapshot | text | name at order time |
| unit_price_snapshot | numeric(10,2) | price at order time |
| quantity | integer | ≥ 1 |
| notes | text | optional |
| status | enum | pending / preparing / ready / served / cancelled |
| cancelled_reason | text, nullable | required if cancelled |
| cancelled_by_staff_id | uuid, nullable | |

## 8. Out of scope

- Modifying an order after it's billed
- Guest-facing order tracking or status page
- Delivery-partner dispatch/tracking
