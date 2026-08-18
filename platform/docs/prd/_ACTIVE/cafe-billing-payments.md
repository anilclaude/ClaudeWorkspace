# Café — Billing & Payments

**Build order: 5 of 7 (parallel with `cafe-kitchen-display`).** Depends on: `cafe-order-management`, `cafe-access-roles`.

Wireframes: `platform/docs/wireframes/cafe-billing-payments/` *(to be added before `/plan`)*

## 1. What we're building

Turn an order into a bill, take payment, and optionally split the bill across guests. Billing reads an order — it never modifies it; a bill is a new record that references the order, not a transformation of it.

## 2. User stories

- US1 — As a Cashier, I can generate a bill for an order showing every item, the subtotal, tax, and total.
- US2 — As a Cashier, I can apply a discount with a reason.
- US3 — As a Cashier, I can record payment by Cash, Card, or Digital Wallet.
- US4 — As a Cashier, I can split a bill across several guests at one table.

## 3. Acceptance criteria

- AC1 — A bill lists every order item with its quantity and price, plus subtotal, tax, and total.
- AC2 — A bill cannot be generated for an order with zero items.
- AC3 — A discount requires a reason and records which staff member applied it.
- AC4 — A discount can never bring the bill total below zero.
- AC5 — A payment requires a method: Cash, Card, or Digital Wallet.
- AC6 — An order is marked Paid only when the recorded payment is equal to or greater than the bill total.
- AC7 — A split bill's parts must add up to exactly the original total — no more, no less.

## 4. Validation Contracts

- VC-001 — Generating a bill for an order with zero items returns an error, not an empty bill.
- VC-002 — A discount request that would take the total below zero is rejected before the bill is saved.
- VC-003 — Applying a discount is rejected for any role other than Admin or Manager (built on `cafe-access-roles`' guard); every applied discount records the acting staff id.
- VC-004 — A bill is marked Paid only when `sum(payments.amount) >= bill.total_amount`.
- VC-005 — The sum of a bill's split parts equals the bill's total exactly — a rounding mismatch is rejected, not silently absorbed.

## 5. Technical details

| Decision | Detail |
|---|---|
| Backend | `backend/cafe/src/modules/billing/` — reads `orders`/`order_items` from the Orders module, writes only to its own tables |
| Frontend | `frontend/web/src/modules/billing/` |
| Contracts | `shared/contracts/src/cafe/billing.ts` — `Bill`, `BillSplit` |
| Money | All amount columns use Postgres `numeric`, never floating point |

## 6. Integration across modules

Reads Orders (PRD 4) to build a bill; never writes back to `orders` or `order_items`. Every discount and payment stamps the acting staff id, sourced from the validated JWT (PRD 1), never from client-supplied input.

## 7. Database tables

**bills**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| order_id | uuid | FK → orders, unique |
| subtotal | numeric(10,2) | |
| discount_amount | numeric(10,2) | default 0 |
| discount_reason | text, nullable | required if discount > 0 |
| discount_applied_by_staff_id | uuid, nullable | |
| tax_amount | numeric(10,2) | |
| total_amount | numeric(10,2) | |
| payment_status | enum | unpaid / paid |
| paid_at | timestamp, nullable | |

**bill_splits**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| bill_id | uuid | FK → bills |
| split_label | text | e.g. "Guest 1" |
| amount | numeric(10,2) | |
| payment_method | enum | cash / card / digital_wallet |
| paid_at | timestamp, nullable | |

## 8. Out of scope

- Refunds or voided payments
- Tax-compliant invoice/document generation
- Online payment gateway integration
