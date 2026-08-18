# Café — Kitchen Display

**Build order: 5 of 7 (parallel with `cafe-billing-payments`).** Depends on: `cafe-order-management`.

Wireframes: `platform/docs/wireframes/cafe-kitchen-display/` *(to be added before `/plan`)*

## 1. What we're building

A screen for kitchen staff showing incoming orders in real time, so they know what to prepare and in what order. This PRD introduces no new tables — it reads and updates `order_items`, owned by Order Management.

## 2. User stories

- US1 — As Kitchen Staff, I see new order items appear on screen the moment they're sent, oldest first.
- US2 — As Kitchen Staff, I mark each item Preparing, then Ready, as I cook it.
- US3 — As a Waiter, I can see which items are Ready and waiting to be served.

## 3. Acceptance criteria

- AC1 — A newly sent order item appears on the kitchen screen within a few seconds.
- AC2 — Items are shown oldest-first.
- AC3 — An item's status can only move forward: Pending → Preparing → Ready. It cannot skip a step.
- AC4 — Once marked Ready, an item cannot return to Preparing without a Manager override.
- AC5 — The waiter's screen highlights items that are Ready but not yet served.

## 4. Validation Contracts

- VC-001 — A status-transition request that is not exactly one step forward (Pending→Preparing or Preparing→Ready) is rejected.
- VC-002 — Reverting Ready to Preparing is rejected unless the request carries a Manager-role override (built on `cafe-access-roles`' guard).
- VC-003 — A newly created order item is visible via the kitchen queue within the agreed latency budget (see the open decision below) — verified against whichever mechanism is chosen.

## 5. Technical details

| Decision | Detail |
|---|---|
| Backend | `backend/cafe/src/modules/kitchen/` — operates on the `order_items` entity owned by the Orders module; both are Nest modules inside the same `backend/cafe` service, so this is an in-process call, not a network hop |
| Frontend | `frontend/web/src/modules/kitchen/` |

**Open technical decision — route to `scaffold/memory/DECISIONS.md` before `/plan`:**
How does the kitchen screen get new orders "within a few seconds" (AC1)? Two options: a WebSocket connection (real-time, more moving parts) or short-interval polling (simpler, small delay). This is the PRD that actually needs the answer — it was deferred out of the original combined draft specifically so it wouldn't block the PRDs that don't need it.

## 6. Integration across modules

Modifies `order_items` rows owned by `cafe-order-management` — it does not introduce its own table. Its Ready transitions are what `cafe-inventory-management` (PRD 6) hooks into to trigger stock deduction.

## 7. Database tables

None — extends behavior on `order_items` (owned by `cafe-order-management`).

## 8. Out of scope

- Kitchen ticket printing
- Prep-time estimates or cook timers
- Multiple kitchen stations (grill, drinks, dessert) routing separately — all items share one queue in v1
