# Café — Access & Roles (Foundation)

**Build order: 1 of 7.** Depends on: `backend/auth` (existing) only.

## 1. What we're building

A role-checking mechanism so that actions in the café app can require a specific staff role before they're allowed. This PRD introduces no screens of its own — it's the guard every later café PRD's sensitive actions (discounts, cancellations, stock adjustments) will rely on, built once here rather than reinvented per module.

It also establishes the `backend/cafe` service itself — every later café PRD adds modules to it, none of them create it.

## 2. User stories

- US1 — As any café staff member, when I make a request to a protected action, the system checks my role from my login token before allowing it.
- US2 — As a Waiter, Cashier, or Kitchen staff member, if I attempt an action reserved for Admin or Manager, I'm blocked with a clear message rather than a confusing error.
- US3 — As the system, every write to a sensitive field in a later PRD (a discount, a cancellation, a stock adjustment) can record which staff member performed it, using this same identity check.

## 3. Acceptance criteria

- AC1 — A request to a protected endpoint with no valid login token is rejected (401).
- AC2 — A request with a valid token but the wrong role is rejected (403), not silently ignored.
- AC3 — A request with a valid token and an allowed role succeeds, and the caller's staff id is available to the rest of that request for logging.
- AC4 — The five roles — Admin, Manager, Cashier, Waiter, Kitchen — are the only valid values. A token carrying an unrecognized role is treated as having no valid role.
- AC5 — Every café endpoint explicitly declares which role(s) it requires. There is no endpoint with an undeclared or default-allow policy — even "logged in only, any role" must be stated, not assumed.

## 4. Validation Contracts

- VC-001 — Calling a protected endpoint with no `Authorization` header returns 401.
- VC-002 — Calling a protected endpoint with a token whose role isn't in its allowed list returns 403.
- VC-003 — Calling a protected endpoint with a valid, allowed role succeeds, and the handler reads the staff id from the token — never from the request body, so a client can't claim to be someone else.
- VC-004 — Every controller method in `backend/cafe` carries an explicit role declaration; a build-time check fails if one is missing, so an endpoint can't accidentally ship unguarded.

## 5. Technical details

| Decision | Detail |
|---|---|
| New service | `backend/cafe` — NestJS, owns `cafe_db` exclusively, port **4003** |
| Guard | A reusable role guard in `backend/cafe/src/common/guards/` — service-local; promote to `backend/libs/` only if a second service needs the same pattern |
| Token | Reuses whatever `backend/auth` already issues — no new token format, no new claims format invented here |
| Storage | No new database tables. Staff and role data isn't duplicated locally — `cafe_db` never stores a copy of who's on staff |

## 6. Integration across modules

This PRD's guard is imported by every later café PRD wherever an action needs a role check — Menu's admin actions, Order's cancellations, Billing's discounts, Inventory's stock adjustments. It has no dependents going the other direction: it depends only on `backend/auth`, never on anything built later.

## 7. Database tables

None. Role and identity data is read from the JWT at request time, never persisted locally.

## 8. Out of scope

- Creating or inviting staff accounts — that's an `backend/auth` concern, not built here
- Custom/configurable permissions per restaurant — the five roles are fixed
- Wireframes — this PRD has no UI; `/plan` can run on it directly without a wireframe folder
