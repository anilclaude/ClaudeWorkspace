# Café — Menu Management

**Build order: 2 of 7.** Depends on: `cafe-access-roles`.

Wireframes: `platform/docs/wireframes/cafe-menu-management/` *(to be added before `/plan`)*

## 1. What we're building

Let Admin staff manage the menu — items, categories, prices, and availability — so later PRDs (Order Management) have something real to reference. This is the first PRD that gives the café app a visible screen.

## 2. User stories

- US1 — As an Admin, I can add a menu item with a name, price, category, and photo.
- US2 — As an Admin, I can mark an item unavailable without deleting it, so it disappears from ordering temporarily.
- US3 — As an Admin, I can group items into categories (Starters, Mains, Beverages…) so the menu is easy to browse.

## 3. Acceptance criteria

- AC1 — A new menu item requires a name, category, and price before it can be saved.
- AC2 — Price must be a positive number; zero or negative is rejected.
- AC3 — Marking an item unavailable hides it from the ordering screen but keeps it visible in the admin list.
- AC4 — An unavailable item can be marked available again at any time.
- AC5 — Every item belongs to exactly one category.
- AC6 — Categories can be reordered, and the menu screen reflects that order.

## 4. Validation Contracts

- VC-001 — Saving a menu item with price ≤ 0 is rejected before it reaches the database.
- VC-002 — Saving a menu item missing a name or category is rejected, naming the missing field(s).
- VC-003 — An item flagged unavailable is absent from the ordering list but present in the admin list, in the same request cycle.
- VC-004 — Adding, editing, or removing a menu item is rejected for any role other than Admin (built on `cafe-access-roles`' guard).

## 5. Technical details

| Decision | Detail |
|---|---|
| Backend | `backend/cafe/src/modules/menu/` — controller, service, entities |
| Frontend | `frontend/web/src/modules/menu/` |
| Contracts | `shared/contracts/src/cafe/menu.ts` — `MenuItem`, `MenuCategory` |

## 6. Integration across modules

Order Management (PRD 4) will reference `menu_items` by id and take a name/price *snapshot* at order time — Menu doesn't need to know Orders exists. Inventory Management (PRD 6) will later attach a recipe to a `menu_item` via a table it owns (`menu_item_ingredients`) — Menu doesn't own or know about recipes.

## 7. Database tables

**menu_categories**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| name | text | required |
| sort_order | integer | display order |

**menu_items**
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| category_id | uuid | FK → menu_categories |
| name | text | required |
| description | text | optional |
| price | numeric(10,2) | > 0 |
| is_available | boolean | default true |
| image_url | text | optional |
| created_at / updated_at | timestamp | |

## 8. Out of scope

- Recipes/ingredients — that's `cafe-inventory-management` (PRD 6), which references `menu_items` created here
- Item modifiers or add-ons (extra cheese, size options)
- Menu versioning or scheduled menu changes (e.g. breakfast vs. dinner menus)
