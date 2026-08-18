import { describe, it, expect } from 'vitest';
import {
  CAFE_ROUTES,
  menuCategorySchema,
  createMenuCategoryRequestSchema,
  reorderMenuCategoriesRequestSchema,
  menuItemSchema,
  createMenuItemRequestSchema,
  updateMenuItemRequestSchema,
  menuItemListResponseSchema,
  MENU_ITEM_NAME_REQUIRED_MESSAGE,
  MENU_ITEM_CATEGORY_REQUIRED_MESSAGE,
  MENU_ITEM_PRICE_INVALID_MESSAGE,
} from './index';

describe('cafe menu contracts — T01 (foundational, no AC binds directly)', () => {
  it('exposes the routes later tasks implement against', () => {
    expect(CAFE_ROUTES.categories).toBe('/menu/categories');
    expect(CAFE_ROUTES.reorderCategories).toBe('/menu/categories/reorder');
    expect(CAFE_ROUTES.items).toBe('/menu/items');
    expect(CAFE_ROUTES.availableItems).toBe('/menu/items/available');
  });

  describe('menuCategorySchema', () => {
    it('accepts a well-formed category (id, name, sortOrder)', () => {
      const parsed = menuCategorySchema.safeParse({ id: 'c-1', name: 'Starters', sortOrder: 0 });
      expect(parsed.success).toBe(true);
    });

    it('rejects a non-integer sortOrder', () => {
      const parsed = menuCategorySchema.safeParse({ id: 'c-1', name: 'Starters', sortOrder: 1.5 });
      expect(parsed.success).toBe(false);
    });
  });

  describe('createMenuCategoryRequestSchema', () => {
    it('accepts a non-empty name', () => {
      const parsed = createMenuCategoryRequestSchema.safeParse({ name: 'Mains' });
      expect(parsed.success).toBe(true);
    });

    it('rejects an empty name, naming the field (VC-002 shape, category side)', () => {
      const parsed = createMenuCategoryRequestSchema.safeParse({ name: '' });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.path).toEqual(['name']);
      }
    });
  });

  describe('reorderMenuCategoriesRequestSchema — AC6 (categories can be reordered)', () => {
    it('accepts a non-empty ordered list of category ids', () => {
      const parsed = reorderMenuCategoriesRequestSchema.safeParse({
        orderedCategoryIds: ['c-2', 'c-1', 'c-3'],
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects an empty list', () => {
      const parsed = reorderMenuCategoriesRequestSchema.safeParse({ orderedCategoryIds: [] });
      expect(parsed.success).toBe(false);
    });
  });

  describe('menuItemSchema', () => {
    const validItem = {
      id: 'i-1',
      categoryId: 'c-1',
      name: 'Spring Rolls',
      description: null,
      price: 5,
      isAvailable: true,
      imageUrl: null,
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    };

    it('accepts a full item with nullable description/imageUrl (both optional per PRD/wireframe)', () => {
      expect(menuItemSchema.safeParse(validItem).success).toBe(true);
    });

    it('AC5 — categoryId is a single scalar id, not an array', () => {
      const withArrayCategory = { ...validItem, categoryId: ['c-1', 'c-2'] };
      expect(menuItemSchema.safeParse(withArrayCategory).success).toBe(false);
    });

    it('AC3/AC4 — isAvailable is a required boolean, both true and false are valid', () => {
      expect(menuItemSchema.safeParse({ ...validItem, isAvailable: false }).success).toBe(true);
      expect(menuItemSchema.safeParse({ ...validItem, isAvailable: true }).success).toBe(true);
      const missing = { ...validItem } as Record<string, unknown>;
      delete missing.isAvailable;
      expect(menuItemSchema.safeParse(missing).success).toBe(false);
    });
  });

  describe('createMenuItemRequestSchema — AC1 (name, category, price required)', () => {
    const validRequest = { name: 'Iced Tea', categoryId: 'c-3', price: 3 };

    it('accepts a request with name, categoryId, and a positive price', () => {
      expect(createMenuItemRequestSchema.safeParse(validRequest).success).toBe(true);
    });

    it('accepts optional description and imageUrl alongside the required fields', () => {
      const parsed = createMenuItemRequestSchema.safeParse({
        ...validRequest,
        description: 'Chilled black tea',
        imageUrl: 'https://example.com/iced-tea.png',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects a missing name, naming the field with MENU_ITEM_NAME_REQUIRED_MESSAGE', () => {
      const withoutName: Record<string, unknown> = { ...validRequest };
      delete withoutName.name;
      const parsed = createMenuItemRequestSchema.safeParse(withoutName);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const nameIssue = parsed.error.issues.find((issue) => issue.path[0] === 'name');
        expect(nameIssue?.message).toBe(MENU_ITEM_NAME_REQUIRED_MESSAGE);
      }
    });

    it('rejects an empty-string name the same way as a missing one', () => {
      const parsed = createMenuItemRequestSchema.safeParse({ ...validRequest, name: '   ' });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe(MENU_ITEM_NAME_REQUIRED_MESSAGE);
      }
    });

    it('rejects a missing categoryId, naming the field with MENU_ITEM_CATEGORY_REQUIRED_MESSAGE', () => {
      const withoutCategory: Record<string, unknown> = { ...validRequest };
      delete withoutCategory.categoryId;
      const parsed = createMenuItemRequestSchema.safeParse(withoutCategory);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const categoryIssue = parsed.error.issues.find((issue) => issue.path[0] === 'categoryId');
        expect(categoryIssue?.message).toBe(MENU_ITEM_CATEGORY_REQUIRED_MESSAGE);
      }
    });

    it('rejects both name and category missing at once, naming both fields (VC-002)', () => {
      const parsed = createMenuItemRequestSchema.safeParse({ price: 5 });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const paths = parsed.error.issues.map((issue) => issue.path[0]);
        expect(paths).toContain('name');
        expect(paths).toContain('categoryId');
      }
    });

    describe('AC2/VC-001 — price must be a positive number', () => {
      it('rejects price of zero', () => {
        const parsed = createMenuItemRequestSchema.safeParse({ ...validRequest, price: 0 });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          const priceIssue = parsed.error.issues.find((issue) => issue.path[0] === 'price');
          expect(priceIssue?.message).toBe(MENU_ITEM_PRICE_INVALID_MESSAGE);
        }
      });

      it('rejects a negative price, naming the field with MENU_ITEM_PRICE_INVALID_MESSAGE', () => {
        const parsed = createMenuItemRequestSchema.safeParse({ ...validRequest, price: -5 });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          const priceIssue = parsed.error.issues.find((issue) => issue.path[0] === 'price');
          expect(priceIssue?.message).toBe(MENU_ITEM_PRICE_INVALID_MESSAGE);
        }
      });

      it('accepts a positive decimal price', () => {
        const parsed = createMenuItemRequestSchema.safeParse({ ...validRequest, price: 12.5 });
        expect(parsed.success).toBe(true);
      });

      it('rejects a missing price, naming the field with MENU_ITEM_PRICE_INVALID_MESSAGE (review cycle 1 fix)', () => {
        const withoutPrice: Record<string, unknown> = { ...validRequest };
        delete withoutPrice.price;
        const parsed = createMenuItemRequestSchema.safeParse(withoutPrice);
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          const priceIssue = parsed.error.issues.find((issue) => issue.path[0] === 'price');
          expect(priceIssue?.message).toBe(MENU_ITEM_PRICE_INVALID_MESSAGE);
        }
      });
    });
  });

  describe('updateMenuItemRequestSchema — T06 toggle and T11 full edit', () => {
    it('accepts an isAvailable-only patch (AC3/AC4 toggle)', () => {
      const parsed = updateMenuItemRequestSchema.safeParse({ isAvailable: false });
      expect(parsed.success).toBe(true);
      const parsedBack = updateMenuItemRequestSchema.safeParse({ isAvailable: true });
      expect(parsedBack.success).toBe(true);
    });

    it('accepts a full-field edit patch (T11 reused form)', () => {
      const parsed = updateMenuItemRequestSchema.safeParse({
        name: 'Veg Burger',
        categoryId: 'c-2',
        price: 9,
        isAvailable: true,
      });
      expect(parsed.success).toBe(true);
    });

    it('re-validates price on patch — rejects patching price to zero', () => {
      const parsed = updateMenuItemRequestSchema.safeParse({ price: 0 });
      expect(parsed.success).toBe(false);
    });

    it('re-validates categoryId on patch — rejects an empty categoryId', () => {
      const parsed = updateMenuItemRequestSchema.safeParse({ categoryId: '' });
      expect(parsed.success).toBe(false);
    });

    it('accepts an empty patch (no-op)', () => {
      const parsed = updateMenuItemRequestSchema.safeParse({});
      expect(parsed.success).toBe(true);
    });
  });

  describe('menuItemListResponseSchema — VC-003 (available vs admin list, same shape)', () => {
    it('accepts an empty list (available-items response when nothing qualifies)', () => {
      const parsed = menuItemListResponseSchema.safeParse({ success: true, data: [], error: null });
      expect(parsed.success).toBe(true);
    });

    it('accepts a list containing both available and unavailable items — admin list keeps both (AC3)', () => {
      const base = {
        id: 'i-1',
        categoryId: 'c-1',
        name: 'Veg Burger',
        description: null,
        price: 9,
        imageUrl: null,
        createdAt: '2026-08-11T00:00:00.000Z',
        updatedAt: '2026-08-11T00:00:00.000Z',
      };
      const parsed = menuItemListResponseSchema.safeParse({
        success: true,
        data: [
          { ...base, id: 'i-1', isAvailable: true },
          { ...base, id: 'i-2', isAvailable: false },
        ],
        error: null,
      });
      expect(parsed.success).toBe(true);
    });
  });
});
