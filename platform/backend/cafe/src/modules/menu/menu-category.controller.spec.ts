import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { cafe } from '@app/contracts';
import { env } from '../../config';
import { RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/guards';
import { MenuCategoryController } from './menu-category.controller';
import { MenuCategoryService } from './menu-category.service';

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

// Controller-level coverage for T03 — the routing/validation wiring around
// MenuCategoryService, mirroring
// backend/auth/src/modules/auth/auth.controller.spec.ts's pattern.
describe('MenuCategoryController', () => {
  let controller: MenuCategoryController;
  let categoryService: { findAll: jest.Mock; create: jest.Mock; reorderCategories: jest.Mock };

  beforeEach(async () => {
    categoryService = { findAll: jest.fn(), create: jest.fn(), reorderCategories: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuCategoryController],
      providers: [{ provide: MenuCategoryService, useValue: categoryService }],
    }).compile();

    controller = module.get<MenuCategoryController>(MenuCategoryController);
  });

  // Route path must match CAFE_ROUTES.categories from
  // shared/contracts/src/cafe/menu.ts exactly — asserted directly so the
  // two can't silently drift apart (per T03's task note: "use it rather
  // than inventing new path strings").
  it("is mounted at CAFE_ROUTES.categories ('/menu/categories')", () => {
    const path = Reflect.getMetadata(PATH_METADATA, MenuCategoryController);
    expect(`/${path}`).toBe(cafe.CAFE_ROUTES.categories);
  });

  describe('list', () => {
    it('returns the categories from the service wrapped in a success envelope', async () => {
      const categories = [
        { id: 'cat-1', name: 'Starters', sortOrder: 0 },
        { id: 'cat-2', name: 'Mains', sortOrder: 1 },
      ];
      categoryService.findAll.mockResolvedValue(categories);

      const result = await controller.list();

      expect(result).toEqual({ success: true, data: categories, error: null });
    });
  });

  describe('create', () => {
    it('parses a well-formed body, delegates to the service, and returns a success envelope', async () => {
      const created = { id: 'cat-1', name: 'Starters', sortOrder: 0 };
      categoryService.create.mockResolvedValue(created);

      const result = await controller.create({ name: 'Starters' });

      expect(categoryService.create).toHaveBeenCalledWith({ name: 'Starters' });
      expect(result).toEqual({ success: true, data: created, error: null });
    });

    it('rejects a request body missing a name without calling the service', async () => {
      await expect(controller.create({})).rejects.toBeInstanceOf(BadRequestException);
      expect(categoryService.create).not.toHaveBeenCalled();
    });

    it('rejects a request body with a blank name without calling the service', async () => {
      await expect(controller.create({ name: '   ' })).rejects.toBeInstanceOf(BadRequestException);
      expect(categoryService.create).not.toHaveBeenCalled();
    });
  });

  // T07 — AC6: categories can be reordered. Route path must match
  // CAFE_ROUTES.reorderCategories ('/menu/categories/reorder') exactly,
  // joined with the class-level path — asserted so the two can't silently
  // drift apart, same convention as every other route test in this file.
  it("reorder is mounted at CAFE_ROUTES.reorderCategories ('/menu/categories/reorder')", () => {
    const classPath = Reflect.getMetadata(PATH_METADATA, MenuCategoryController);
    const methodPath = Reflect.getMetadata(PATH_METADATA, MenuCategoryController.prototype.reorder);
    expect(`/${classPath}/${methodPath}`).toBe(cafe.CAFE_ROUTES.reorderCategories);
  });

  describe('reorder', () => {
    // Accept half — a well-formed body (schema-valid, non-empty array of
    // ids) is parsed, delegated to the service, and the result wrapped in a
    // success envelope, mirroring create()'s coverage shape.
    it('parses a well-formed body, delegates to the service, and returns a success envelope', async () => {
      const reordered = [
        { id: 'cat-2', name: 'Mains', sortOrder: 0 },
        { id: 'cat-1', name: 'Starters', sortOrder: 1 },
      ];
      categoryService.reorderCategories.mockResolvedValue(reordered);

      const result = await controller.reorder({ orderedCategoryIds: ['cat-2', 'cat-1'] });

      expect(categoryService.reorderCategories).toHaveBeenCalledWith(['cat-2', 'cat-1']);
      expect(result).toEqual({ success: true, data: reordered, error: null });
    });

    // Reject half — a request body missing orderedCategoryIds entirely is
    // rejected by reorderMenuCategoriesRequestSchema before reaching the
    // service.
    it('rejects a request body missing orderedCategoryIds without calling the service', async () => {
      await expect(controller.reorder({})).rejects.toBeInstanceOf(BadRequestException);
      expect(categoryService.reorderCategories).not.toHaveBeenCalled();
    });

    // Reject half — an empty orderedCategoryIds array fails the schema's
    // min(1) constraint, rejected before reaching the service.
    it('rejects a request body with an empty orderedCategoryIds array without calling the service', async () => {
      await expect(controller.reorder({ orderedCategoryIds: [] })).rejects.toBeInstanceOf(BadRequestException);
      expect(categoryService.reorderCategories).not.toHaveBeenCalled();
    });

    // Reject half — the service's own mismatched-ids rejection
    // (BadRequestException) propagates through the controller unchanged,
    // not swallowed/rewrapped, same shape as create()'s equivalent coverage
    // in other controllers in this module.
    it('propagates the service rejection when orderedCategoryIds does not match the current category set', async () => {
      categoryService.reorderCategories.mockRejectedValue(
        new BadRequestException(cafe.MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE),
      );

      let caught: unknown;
      try {
        await controller.reorder({ orderedCategoryIds: ['cat-1'] });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE);
    });
  });
});

// Guard-wiring coverage — proves the real RolesGuard, reading real
// @RequireRoles metadata off the real controller's own prototype methods
// (not a stand-in dummy class, unlike roles.guard.spec.ts's own fixtures),
// actually enforces Admin-only on both endpoints. This is the load-bearing
// proof for this task's central judgment call: both list() and create() are
// Admin-only (see scaffold/memory/DECISIONS.md, "cafe-menu-management T03").
describe('MenuCategoryController role wiring', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  function buildContext(
    handler: (...args: unknown[]) => unknown,
    request: AuthenticatedRequest,
  ) {
    return {
      getHandler: () => handler,
      getClass: () => MenuCategoryController,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it.each([
    ['list', MenuCategoryController.prototype.list],
    ['create', MenuCategoryController.prototype.create],
    ['reorder', MenuCategoryController.prototype.reorder],
  ])('rejects a Waiter token on %s with 403', async (_name, handler) => {
    const token = signToken({ sub: 'staff-1', role: 'Waiter' });
    const context = buildContext(handler, { headers: { authorization: `Bearer ${token}` } });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it.each([
    ['list', MenuCategoryController.prototype.list],
    ['create', MenuCategoryController.prototype.create],
    ['reorder', MenuCategoryController.prototype.reorder],
  ])('rejects a request with no token on %s with 401', async (_name, handler) => {
    const context = buildContext(handler, { headers: {} });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it.each([
    ['list', MenuCategoryController.prototype.list],
    ['create', MenuCategoryController.prototype.create],
    ['reorder', MenuCategoryController.prototype.reorder],
  ])('allows an Admin token through on %s', async (_name, handler) => {
    const token = signToken({ sub: 'staff-1', role: 'Admin' });
    const context = buildContext(handler, { headers: { authorization: `Bearer ${token}` } });

    expect(guard.canActivate(context)).toBe(true);
  });
});
