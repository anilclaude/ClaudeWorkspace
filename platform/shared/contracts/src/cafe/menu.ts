// Contracts served by the cafe service (:4003) for the Menu Management PRD
// (platform/docs/prd/_ACTIVE/cafe-menu-management.md). Menu is the owning
// module — entities/migrations land in backend/cafe/src/modules/menu/ against
// these same schemas, per CLAUDE.md non-negotiable #6 ("a cross-boundary type
// is added to shared/contracts first, then implemented against").
//
// Role enforcement (VC-004 — add/edit/remove restricted to Admin) is not
// modeled here: it's the existing @RequireRoles('Admin')/RolesGuard from
// cafe-access-roles (auth.CafeRole, shared/contracts/src/auth/index.ts),
// applied at the controller level in T03/T04/T06/T07. A JSON schema can't
// express "who is allowed to call this," so that stays a guard concern.

import { z } from 'zod';
import { apiResponseSchema } from '../common';

export const CAFE_SERVICE = 'cafe' as const;
export const CAFE_ROUTES = {
  health: '/health',
  healthLive: '/health/live',
  // Categories (T03 create/read, T07 reorder).
  categories: '/menu/categories',
  reorderCategories: '/menu/categories/reorder',
  // Items (T04 create, T05 list — all vs. available-only, T06/T11 update).
  // available-items is a separate route rather than a query flag on `items`
  // — a defensible default per B8, logged in scaffold/memory/DECISIONS.md
  // ("cafe-menu-management T01") since T05 depends on this shape.
  items: '/menu/items',
  availableItems: '/menu/items/available',
} as const;

// ---------------------------------------------------------------------------
// Shared field-level messages. Exported as named constants (same pattern as
// auth's LOGIN_INVALID_CREDENTIALS_MESSAGE) so the exact copy shown in
// cafe-menu-add-error.png ("Name is required", "Price must be greater than
// zero") has one definition — backend validation and frontend display both
// read it, never retype it.
// ---------------------------------------------------------------------------

export const MENU_ITEM_NAME_REQUIRED_MESSAGE = 'Name is required' as const;
export const MENU_ITEM_CATEGORY_REQUIRED_MESSAGE = 'Category is required' as const;
export const MENU_ITEM_PRICE_INVALID_MESSAGE = 'Price must be greater than zero' as const;
export const MENU_CATEGORY_NAME_REQUIRED_MESSAGE = 'Name is required' as const;
/** T04 — categoryId is present and well-formed (passes
 * createMenuItemRequestSchema) but doesn't reference an existing category
 * row. Distinct from MENU_ITEM_CATEGORY_REQUIRED_MESSAGE (categoryId
 * missing/empty), so the client can tell "you didn't pick a category" apart
 * from "the category you picked doesn't exist" (e.g. deleted between the
 * form loading and submit). See scaffold/memory/DECISIONS.md,
 * "cafe-menu-management T04". */
export const MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE = 'Category not found' as const;
/** T06 — PATCH /menu/items/:id against an id that doesn't reference an
 * existing item. Not pinned by any AC/VC/wireframe (T06's own PRD/AC text is
 * silent on this case); a defensible REST-conventional default (404), see
 * scaffold/memory/DECISIONS.md, "cafe-menu-management T06". */
export const MENU_ITEM_NOT_FOUND_MESSAGE = 'Menu item not found' as const;
/** T07 — POST /menu/categories/reorder's orderedCategoryIds must exactly
 * match the current set of category ids (same size, no unknown/missing id,
 * no duplicate). Not pinned by any AC/VC/wireframe (T07 is backend-only) — a
 * defensible default given this endpoint rewrites every row's sortOrder
 * wholesale: rejecting the whole request outright is safer than silently
 * reordering a partial/ambiguous set and leaving some row's sortOrder stale
 * or duplicated. See scaffold/memory/DECISIONS.md, "cafe-menu-management
 * T07". */
export const MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE =
  'orderedCategoryIds must exactly match the current set of category ids' as const;

// ---------------------------------------------------------------------------
// MenuCategory — menu_categories table (PRD section 7). id + name + sortOrder
// only; no created/updated timestamps because the PRD's table definition
// doesn't list any for this entity (matching the table exactly rather than
// speculatively adding columns, per B1).
// ---------------------------------------------------------------------------

export const menuCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Display order — AC6: categories can be reordered, and the menu screen
   * reflects that order. Ascending sortOrder is the list order. */
  sortOrder: z.number().int(),
});
export type MenuCategory = z.infer<typeof menuCategorySchema>;

/** POST /menu/categories body (T03). sortOrder is server-assigned (appended
 * to the end) — the PRD gives no explicit-position-on-create requirement, so
 * reordering is exclusively the job of the dedicated reorder endpoint. */
export const createMenuCategoryRequestSchema = z.object({
  name: z.string(MENU_CATEGORY_NAME_REQUIRED_MESSAGE).trim().min(1, MENU_CATEGORY_NAME_REQUIRED_MESSAGE).max(255),
});
export type CreateMenuCategoryRequest = z.infer<typeof createMenuCategoryRequestSchema>;

/** POST /menu/categories/reorder body (T07) — AC6. The full, ordered list of
 * category ids; the service assigns sortOrder = index in this array. Chosen
 * over a list of {id, sortOrder} pairs because it can't express duplicate or
 * gapped positions — a defensible default (B8), logged in DECISIONS.md. */
export const reorderMenuCategoriesRequestSchema = z.object({
  orderedCategoryIds: z.array(z.string()).min(1),
});
export type ReorderMenuCategoriesRequest = z.infer<typeof reorderMenuCategoriesRequestSchema>;

// ---------------------------------------------------------------------------
// MenuItem — menu_items table (PRD section 7).
// ---------------------------------------------------------------------------

export const menuItemSchema = z.object({
  id: z.string(),
  /** AC5 — every item belongs to exactly one category: a single scalar FK,
   * never an array. */
  categoryId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  /** numeric(10,2) in Postgres, represented as a plain number of dollars
   * (matches the wireframe's "$5.00" display, computed by formatting this
   * value client-side rather than the contract carrying pre-formatted text). */
  price: z.number(),
  /** AC3/AC4 — unavailable hides an item from ordering while keeping it
   * visible (with its own badge, per index.md's builder note) in the admin
   * list; toggles back to available at any time. */
  isAvailable: z.boolean(),
  /** Optional per the PRD and the wireframe (no `*` on the Photo field).
   * Carries a URL, not raw file bytes — this PRD has no upload endpoint of
   * its own (out of scope per PRD section 8's silence on it), so the
   * contract assumes the client already has a hosted URL by the time it
   * calls create/update. Logged in DECISIONS.md. */
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

/**
 * POST /menu/items body (T04) — AC1 (name, category, price all required),
 * AC2/VC-001 (price must be a positive number), AC5 (categoryId is a single
 * scalar, not an array). Zod's per-field issues (one per failing key) are
 * how VC-002 ("naming the missing field(s)") is satisfied — safeParse on a
 * payload missing both name and price yields two issues, one per path.
 */
export const createMenuItemRequestSchema = z.object({
  // The base-type message (first arg to z.string()) covers a field missing
  // from the payload entirely; .min(1, ...) covers one present but empty —
  // same user-facing "required" violation either way, same message for both.
  name: z.string(MENU_ITEM_NAME_REQUIRED_MESSAGE).trim().min(1, MENU_ITEM_NAME_REQUIRED_MESSAGE).max(255),
  categoryId: z.string(MENU_ITEM_CATEGORY_REQUIRED_MESSAGE).min(1, MENU_ITEM_CATEGORY_REQUIRED_MESSAGE),
  // Same base-type-message treatment as name/categoryId above — a fully
  // missing `price` key must produce MENU_ITEM_PRICE_INVALID_MESSAGE too, not
  // zod's generic "expected number, received undefined" (review cycle 1 fix).
  price: z.number(MENU_ITEM_PRICE_INVALID_MESSAGE).positive(MENU_ITEM_PRICE_INVALID_MESSAGE),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
});
export type CreateMenuItemRequest = z.infer<typeof createMenuItemRequestSchema>;

/**
 * PATCH /menu/items/:id body (T06's isAvailable toggle, T11's full edit
 * form). Every field optional — T06 sends only `isAvailable`; T11 sends the
 * full form (name/categoryId/price/description/imageUrl) plus the same
 * toggle. Re-validates the same constraints as create when a field is
 * present (a caller can't PATCH price to 0, or categoryId to '').
 */
export const updateMenuItemRequestSchema = z.object({
  name: z.string().trim().min(1, MENU_ITEM_NAME_REQUIRED_MESSAGE).max(255).optional(),
  categoryId: z.string().min(1, MENU_ITEM_CATEGORY_REQUIRED_MESSAGE).optional(),
  price: z.number().positive(MENU_ITEM_PRICE_INVALID_MESSAGE).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
});
export type UpdateMenuItemRequest = z.infer<typeof updateMenuItemRequestSchema>;

// ---------------------------------------------------------------------------
// Response envelopes — the shared apiResponseSchema wrapper (success/data/
// error discriminated union), same as every other service's routes.
// ---------------------------------------------------------------------------

export const menuCategoryResponseSchema = apiResponseSchema(menuCategorySchema);
export type MenuCategoryResponse = z.infer<typeof menuCategoryResponseSchema>;

export const menuCategoryListResponseSchema = apiResponseSchema(z.array(menuCategorySchema));
export type MenuCategoryListResponse = z.infer<typeof menuCategoryListResponseSchema>;

export const menuItemResponseSchema = apiResponseSchema(menuItemSchema);
export type MenuItemResponse = z.infer<typeof menuItemResponseSchema>;

/** Used for both GET /menu/items (admin, all items) and GET
 * /menu/items/available (ordering screen, VC-003) — same MenuItem shape,
 * different query. */
export const menuItemListResponseSchema = apiResponseSchema(z.array(menuItemSchema));
export type MenuItemListResponse = z.infer<typeof menuItemListResponseSchema>;
