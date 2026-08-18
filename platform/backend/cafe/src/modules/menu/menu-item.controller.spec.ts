import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, ParseUUIDPipe, UnauthorizedException } from '@nestjs/common';
import { PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { cafe } from '@app/contracts';
import { env } from '../../config';
import { RolesGuard } from '../../common/guards';
import type { AuthenticatedRequest } from '../../common/guards';
import { MenuItemController } from './menu-item.controller';
import { MenuItemService } from './menu-item.service';

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
}

// Controller-level coverage for T04 (AC1, AC2, AC5) — the routing/validation
// wiring around MenuItemService, mirroring
// menu-category.controller.spec.ts's pattern.
describe('MenuItemController', () => {
  let controller: MenuItemController;
  let itemService: { create: jest.Mock; findAll: jest.Mock; findAvailable: jest.Mock; update: jest.Mock };

  const validBody = { name: 'Espresso', categoryId: 'cat-1', price: 3.5 };
  const createdItem = {
    id: 'item-1',
    categoryId: 'cat-1',
    name: 'Espresso',
    description: null,
    price: 3.5,
    isAvailable: true,
    imageUrl: null,
    createdAt: new Date('2026-08-11T00:00:00.000Z'),
    updatedAt: new Date('2026-08-11T00:00:00.000Z'),
  };

  beforeEach(async () => {
    itemService = { create: jest.fn(), findAll: jest.fn(), findAvailable: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuItemController],
      providers: [{ provide: MenuItemService, useValue: itemService }],
    }).compile();

    controller = module.get<MenuItemController>(MenuItemController);
  });

  // Route path must match CAFE_ROUTES.items ('/menu/items') exactly — so the
  // two can't silently drift apart.
  it("is mounted at CAFE_ROUTES.items ('/menu/items')", () => {
    const path = Reflect.getMetadata(PATH_METADATA, MenuItemController);
    expect(`/${path}`).toBe(cafe.CAFE_ROUTES.items);
  });

  // T05 — listAvailable()'s own route path must match
  // CAFE_ROUTES.availableItems ('/menu/items/available') exactly, joined
  // with the class-level path above.
  it("listAvailable is mounted at CAFE_ROUTES.availableItems ('/menu/items/available')", () => {
    const classPath = Reflect.getMetadata(PATH_METADATA, MenuItemController);
    const methodPath = Reflect.getMetadata(PATH_METADATA, MenuItemController.prototype.listAvailable);
    expect(`/${classPath}/${methodPath}`).toBe(cafe.CAFE_ROUTES.availableItems);
  });

  // T06 — update()'s own route path must match `${CAFE_ROUTES.items}/:id`
  // exactly, joined with the class-level path above. No dedicated named
  // route constant per this task's own instructions — ordinary Nest
  // route-param convention.
  it("update is mounted at `${CAFE_ROUTES.items}/:id`", () => {
    const classPath = Reflect.getMetadata(PATH_METADATA, MenuItemController);
    const methodPath = Reflect.getMetadata(PATH_METADATA, MenuItemController.prototype.update);
    expect(`/${classPath}/${methodPath}`).toBe(`${cafe.CAFE_ROUTES.items}/:id`);
  });

  // T05 — admin view: every item, regardless of availability (AC3).
  describe('list', () => {
    it('returns every item from the service wrapped in a success envelope, with Date fields serialized to ISO strings', async () => {
      itemService.findAll.mockResolvedValue([createdItem]);

      const result = await controller.list();

      expect(itemService.findAll).toHaveBeenCalledWith();
      expect(result).toEqual({
        success: true,
        data: [
          {
            id: 'item-1',
            categoryId: 'cat-1',
            name: 'Espresso',
            description: null,
            price: 3.5,
            isAvailable: true,
            imageUrl: null,
            createdAt: '2026-08-11T00:00:00.000Z',
            updatedAt: '2026-08-11T00:00:00.000Z',
          },
        ],
        error: null,
      });
    });

    it('returns an empty list wrapped in a success envelope when no items exist', async () => {
      itemService.findAll.mockResolvedValue([]);

      const result = await controller.list();

      expect(result).toEqual({ success: true, data: [], error: null });
    });
  });

  // T05/VC-003 — available-items query method: same shape, delegates to the
  // service's filtered method instead of findAll().
  describe('listAvailable', () => {
    it('returns only the available items from the service wrapped in a success envelope', async () => {
      const unavailableFiltered = { ...createdItem, id: 'item-2', isAvailable: true };
      itemService.findAvailable.mockResolvedValue([unavailableFiltered]);

      const result = await controller.listAvailable();

      expect(itemService.findAvailable).toHaveBeenCalledWith();
      expect(itemService.findAll).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: [
          {
            id: 'item-2',
            categoryId: 'cat-1',
            name: 'Espresso',
            description: null,
            price: 3.5,
            isAvailable: true,
            imageUrl: null,
            createdAt: '2026-08-11T00:00:00.000Z',
            updatedAt: '2026-08-11T00:00:00.000Z',
          },
        ],
        error: null,
      });
    });

    it('returns an empty list wrapped in a success envelope when no items are available', async () => {
      itemService.findAvailable.mockResolvedValue([]);

      const result = await controller.listAvailable();

      expect(result).toEqual({ success: true, data: [], error: null });
    });
  });

  describe('create', () => {
    // AC1/AC2/AC5 happy path — a well-formed body is parsed, delegated to
    // the service, and the entity's Date fields are serialized to ISO
    // strings matching menuItemSchema.
    it('parses a well-formed body, delegates to the service, and returns a success envelope', async () => {
      itemService.create.mockResolvedValue(createdItem);

      const result = await controller.create(validBody);

      expect(itemService.create).toHaveBeenCalledWith(validBody);
      expect(result).toEqual({
        success: true,
        data: {
          id: 'item-1',
          categoryId: 'cat-1',
          name: 'Espresso',
          description: null,
          price: 3.5,
          isAvailable: true,
          imageUrl: null,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T00:00:00.000Z',
        },
        error: null,
      });
    });

    // AC1/VC-002 — a request missing name is rejected before reaching the
    // service, and names the missing field.
    it('rejects a request body missing a name without calling the service', async () => {
      let caught: unknown;
      try {
        await controller.create({ categoryId: 'cat-1', price: 3.5 });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_NAME_REQUIRED_MESSAGE);
      expect(itemService.create).not.toHaveBeenCalled();
    });

    // AC1/AC5/VC-002 — a request missing categoryId is rejected, naming the
    // missing field.
    it('rejects a request body missing a category without calling the service', async () => {
      let caught: unknown;
      try {
        await controller.create({ name: 'Espresso', price: 3.5 });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_CATEGORY_REQUIRED_MESSAGE);
      expect(itemService.create).not.toHaveBeenCalled();
    });

    // AC2/VC-001 — a non-positive price is rejected, naming the price field,
    // without calling the service.
    it.each([0, -1])('rejects a request body with price %s without calling the service', async (price) => {
      let caught: unknown;
      try {
        await controller.create({ name: 'Espresso', categoryId: 'cat-1', price });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_PRICE_INVALID_MESSAGE);
      expect(itemService.create).not.toHaveBeenCalled();
    });

    // AC5 — the service's category-existence rejection (BadRequestException)
    // propagates through the controller unchanged, not swallowed/rewrapped.
    it('propagates the service rejection when categoryId does not reference an existing category', async () => {
      itemService.create.mockRejectedValue(
        new BadRequestException(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE),
      );

      let caught: unknown;
      try {
        await controller.create(validBody);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);
    });
  });

  // T06 — AC3/AC4: the isAvailable toggle, plus the surrounding validation/
  // not-found wiring, at the controller boundary. AC3/AC4's actual proof
  // that the toggle changes what findAvailable()/findAll() return lives at
  // the service/integration level (menu-item.service.spec.ts,
  // menu-item.service.int-spec.ts) — this level proves the route parses the
  // body, delegates id + parsed data to the service, and propagates the
  // service's rejections unchanged, mirroring create()'s coverage shape.
  describe('update', () => {
    // AC3 — marking an item unavailable: a well-formed { isAvailable: false }
    // body is parsed, delegated to the service with the route param id, and
    // the result wrapped in a success envelope.
    it('AC3: parses an isAvailable:false body, delegates id + data to the service, and returns a success envelope', async () => {
      const updated = { ...createdItem, isAvailable: false };
      itemService.update.mockResolvedValue(updated);

      const result = await controller.update('item-1', { isAvailable: false });

      expect(itemService.update).toHaveBeenCalledWith('item-1', { isAvailable: false });
      expect(result).toEqual({
        success: true,
        data: {
          id: 'item-1',
          categoryId: 'cat-1',
          name: 'Espresso',
          description: null,
          price: 3.5,
          isAvailable: false,
          imageUrl: null,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T00:00:00.000Z',
        },
        error: null,
      });
    });

    // AC4 — marking an unavailable item available again: the same handler,
    // the opposite boolean, same delegation shape.
    it('AC4: parses an isAvailable:true body, delegates id + data to the service, and returns a success envelope', async () => {
      const updated = { ...createdItem, isAvailable: true };
      itemService.update.mockResolvedValue(updated);

      const result = await controller.update('item-1', { isAvailable: true });

      expect(itemService.update).toHaveBeenCalledWith('item-1', { isAvailable: true });
      expect((result as { data: { isAvailable: boolean } }).data.isAvailable).toBe(true);
    });

    // A malformed body (e.g. price patched to 0) is rejected before reaching
    // the service, naming the invalid field — same validation the create()
    // path already proves, re-checked here since update() uses a different
    // schema (updateMenuItemRequestSchema).
    it('rejects a request body with a non-positive price without calling the service', async () => {
      let caught: unknown;
      try {
        await controller.update('item-1', { price: 0 });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_PRICE_INVALID_MESSAGE);
      expect(itemService.update).not.toHaveBeenCalled();
    });

    // AC5 still applies to an update — the service's category-existence
    // rejection propagates through the controller unchanged, not
    // swallowed/rewrapped, same shape as create()'s equivalent test.
    it('propagates the service rejection when categoryId does not reference an existing category', async () => {
      itemService.update.mockRejectedValue(
        new BadRequestException(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE),
      );

      let caught: unknown;
      try {
        await controller.update('item-1', { categoryId: 'ghost-cat' });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);
    });

    // Not-found (unpinned by any AC/VC — a defensible 404 default, see
    // scaffold/memory/DECISIONS.md "cafe-menu-management T06"): the
    // service's NotFoundException propagates through the controller
    // unchanged.
    it('propagates the service rejection when the item id does not exist', async () => {
      itemService.update.mockRejectedValue(new NotFoundException(cafe.MENU_ITEM_NOT_FOUND_MESSAGE));

      let caught: unknown;
      try {
        await controller.update('missing-id', { isAvailable: false });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(NotFoundException);
      expect((caught as NotFoundException).message).toBe(cafe.MENU_ITEM_NOT_FOUND_MESSAGE);
    });

    // Review cycle 1 SHOULD-FIX: `id` is a Postgres `uuid` column
    // (itemsRepository.findOneBy({ id })) — a malformed id used to reach
    // that query uncaught, surfacing as a raw 500
    // (`invalid input syntax for type uuid`) instead of a clean 400. Two
    // proofs, since a direct `controller.update(...)` call (as every other
    // test in this file makes) bypasses Nest's own pipe pipeline — pipes
    // only run when Nest's HTTP layer invokes the handler, not on a plain
    // method call:
    //  1. wiring — ParseUUIDPipe is actually bound to the `id` param via
    //     Nest's own ROUTE_ARGS_METADATA (same reflection style this file's
    //     PATH_METADATA route-path tests already use), so it isn't just
    //     imported and unused;
    //  2. behavior — that exact pipe rejects a malformed id with
    //     BadRequestException (400), the class Nest runs before the
    //     handler (and therefore before MenuItemService.update() / the DB)
    //     ever sees it.
    describe('id route param validation (SHOULD-FIX #1)', () => {
      it('wires ParseUUIDPipe to the id route param', () => {
        const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, MenuItemController, 'update') as Record<
          string,
          { index: number; data: string | undefined; pipes: unknown[] }
        >;
        const idParam = Object.values(args).find((arg) => arg.data === 'id');

        expect(idParam).toBeDefined();
        expect(idParam?.pipes).toContain(ParseUUIDPipe);
      });

      it('rejects a malformed id with BadRequestException (400), not letting it reach the service', async () => {
        const pipe = new ParseUUIDPipe();

        await expect(pipe.transform('not-a-uuid', { type: 'param', data: 'id' })).rejects.toBeInstanceOf(
          BadRequestException,
        );
      });

      // Review cycle 2 SHOULD-FIX: the above proves the pipe rejects a bad
      // id, but not that it also lets a good one through — a pipe that
      // rejected everything would have passed that assertion too. This is
      // the symmetric half: a well-formed UUID resolves to itself unchanged,
      // confirming the pipe doesn't also block legitimate ids on their way
      // to the existing well-formed-but-nonexistent-id -> 404 case above.
      it('resolves a well-formed id unchanged, letting it reach the service', async () => {
        const pipe = new ParseUUIDPipe();
        const wellFormedId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

        await expect(pipe.transform(wellFormedId, { type: 'param', data: 'id' })).resolves.toBe(wellFormedId);
      });
    });
  });
});

// Guard-wiring coverage — proves the real RolesGuard, reading real
// @RequireRoles metadata off the real controller's own prototype methods
// (not a stand-in dummy class), actually enforces Admin-only. Mirrors
// menu-category.controller.spec.ts's role-wiring block exactly. T05 extends
// this to list/listAvailable (previously create-only) — the load-bearing
// proof for this task's own re-checked judgment call that both new GET
// routes are Admin-only too (scaffold/memory/DECISIONS.md,
// "cafe-menu-management T05"). T06 extends it again to update() — VC-004's
// Admin-only add/edit/remove requirement, this endpoint being VC-004's
// "removing" mechanism per this ledger's own note.
describe('MenuItemController role wiring', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  // Handler param typed loosely (not (...args: unknown[]) => unknown) since
  // T06's update() has a narrower, concrete signature
  // ((id: string, body: unknown) => ...) than list/listAvailable/create's
  // zero/one-arg handlers — the guard itself only ever calls
  // context.getHandler() for its Reflector metadata, never invokes the
  // handler function, so the exact parameter shape is immaterial here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildContext(handler: (...args: any[]) => unknown, request: AuthenticatedRequest) {
    return {
      getHandler: () => handler,
      getClass: () => MenuItemController,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it.each([
    ['list', MenuItemController.prototype.list],
    ['listAvailable', MenuItemController.prototype.listAvailable],
    ['create', MenuItemController.prototype.create],
    ['update', MenuItemController.prototype.update],
  ])('rejects a Waiter token on %s with 403', (_name, handler) => {
    const token = signToken({ sub: 'staff-1', role: 'Waiter' });
    const context = buildContext(handler, { headers: { authorization: `Bearer ${token}` } });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it.each([
    ['list', MenuItemController.prototype.list],
    ['listAvailable', MenuItemController.prototype.listAvailable],
    ['create', MenuItemController.prototype.create],
    ['update', MenuItemController.prototype.update],
  ])('rejects a request with no token on %s with 401', (_name, handler) => {
    const context = buildContext(handler, { headers: {} });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it.each([
    ['list', MenuItemController.prototype.list],
    ['listAvailable', MenuItemController.prototype.listAvailable],
    ['create', MenuItemController.prototype.create],
    ['update', MenuItemController.prototype.update],
  ])('allows an Admin token through on %s', (_name, handler) => {
    const token = signToken({ sub: 'staff-1', role: 'Admin' });
    const context = buildContext(handler, { headers: { authorization: `Bearer ${token}` } });

    expect(guard.canActivate(context)).toBe(true);
  });
});
