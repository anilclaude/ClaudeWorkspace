# Café — Tables & Reservations

**Build order: 3 of 7.** Depends on: `cafe-access-roles`.

Wireframes: `platform/docs/wireframes/cafe-tables-reservations/` *(to be added before `/plan`)*

## 1. What we're building

Track table status and reservations, so waiters know where to seat guests. This PRD covers tables and bookings as their own concern — the moment-to-moment transition into "Occupied" driven by an actual order is owned by Order Management (PRD 4), not here, since this PRD ships before Orders exists.

## 2. User stories

- US1 — As a Waiter, I can see every table's status at a glance — Free, Occupied, or Reserved.
- US2 — As a Waiter, I can manually seat a walk-in guest at a Free table, even before any order exists.
- US3 — As a Manager, I can reserve a table for a customer with their name, phone number, party size, and time.
- US4 — As a Waiter, I'm shown a flag when a reserved table hasn't been seated shortly after its reservation time.

## 3. Acceptance criteria

- AC1 — A table's displayed status is always one of Free, Occupied, or Reserved — never blank or unknown.
- AC2 — A table starts Free when created, and staff can manually toggle it Occupied/Free directly (independent of any order), so a walk-in can be seated before ordering.
- AC3 — A reservation requires a customer name, phone number, party size, and time before it can be saved.
- AC4 — A table shows Reserved from the reservation time until the guest is seated or the reservation is cancelled.
- AC5 — If a reserved table isn't seated within 15 minutes of the reservation time, it's flagged for staff attention — it is never auto-released.

## 4. Validation Contracts

- VC-001 — Saving a reservation missing any of name/phone/party size/time is rejected, naming all missing fields.
- VC-002 — A table's status field only ever holds one of the three valid values; an invalid write is rejected at both the API and database layer.
- VC-003 — A table flagged "unseated past grace period" is never auto-transitioned back to Free by a background process — only an explicit staff action changes it.

## 5. Technical details

| Decision | Detail |
|---|---|
| Backend | `backend/cafe/src/modules/tables/` |
| Frontend | `frontend/web/src/modules/tables/` |
| Contracts | `shared/contracts/src/cafe/tables.ts` — `RestaurantTable`, `Reservation` |

## 6. Integration across modules

Order Management (PRD 4) will set a table to Occupied when a dine-in order opens, and back to Free when that order is billed and closed. That transition is owned and tested by the Orders PRD, not this one — this PRD only guarantees the status field is always valid and exposes the manual toggle for walk-ins.

## 7. Database tables

**restaurant_tables**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| table_number | text | unique |
| seats | integer | |
| status | enum | free / occupied / reserved |

**reservations**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| table_id | uuid | FK → restaurant_tables |
| customer_name | text | required |
| phone | text | required |
| party_size | integer | |
| reservation_time | timestamp | |
| status | enum | booked / seated / cancelled / no_show |

## 8. Out of scope

- Visual floor-plan / table-layout editor
- Automatic table assignment or recommendation
- SMS/email reservation reminders to the customer
