import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { cafe } from '@app/contracts';
import { MenuItemService } from './menu-item.service';
import { MenuItem } from './entities/menu-item.entity';
import { MenuCategory } from './entities/menu-category.entity';

// Unit coverage for T04's service layer (AC1, AC2, AC5) — repositories are
// mocked here, mirroring menu-category.service.spec.ts's pattern;
// menu-item.service.int-spec.ts proves the same method against a real
// Postgres connection (including the real FK).
describe('MenuItemService', () => {
  let service: MenuItemService;
  let itemsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOneBy: jest.Mock;
  };
  let categoriesRepository: { exists: jest.Mock };
  let queryBuilder: {
    leftJoin: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };

  const validRequest: cafe.CreateMenuItemRequest = {
    name: 'Espresso',
    categoryId: 'cat-1',
    price: 3.5,
  };

  beforeEach(async () => {
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    itemsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOneBy: jest.fn(),
    };
    categoriesRepository = { exists: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuItemService,
        { provide: getRepositoryToken(MenuItem), useValue: itemsRepository },
        { provide: getRepositoryToken(MenuCategory), useValue: categoriesRepository },
      ],
    }).compile();

    service = module.get(MenuItemService);
  });

  describe('create', () => {
    // AC1/AC5 — a well-formed request (name, categoryId, price all present,
    // categoryId referencing a real category) is persisted.
    it('creates an item when the referenced category exists', async () => {
      categoriesRepository.exists.mockResolvedValue(true);
      const created = { ...validRequest, description: null, imageUrl: null };
      itemsRepository.create.mockReturnValue(created);
      itemsRepository.save.mockResolvedValue({ id: 'item-1', ...created });

      const result = await service.create(validRequest);

      expect(categoriesRepository.exists).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
      expect(itemsRepository.create).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        name: 'Espresso',
        price: 3.5,
        description: null,
        imageUrl: null,
      });
      expect(itemsRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual({ id: 'item-1', ...created });
    });

    // AC5 — categoryId is well-formed but doesn't reference an existing
    // category: rejected with a clean, named error rather than reaching the
    // database (see menu-item.service.ts's create() comment for why this
    // check exists alongside the DB's own FK constraint).
    it('rejects a categoryId that does not reference an existing category, without writing', async () => {
      categoriesRepository.exists.mockResolvedValue(false);

      let caught: unknown;
      try {
        await service.create(validRequest);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);
      expect(itemsRepository.create).not.toHaveBeenCalled();
      expect(itemsRepository.save).not.toHaveBeenCalled();
    });

    // description/imageUrl are optional per the contract — omitted fields
    // persist as null, not undefined.
    it('persists null description and imageUrl when omitted from the request', async () => {
      categoriesRepository.exists.mockResolvedValue(true);
      itemsRepository.create.mockReturnValue({});
      itemsRepository.save.mockResolvedValue({});

      await service.create(validRequest);

      expect(itemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null, imageUrl: null }),
      );
    });
  });

  // T05 — admin view: every item, unfiltered. Ordered by category sortOrder
  // then item createdAt (see menu-item.service.ts's orderedQuery() comment).
  describe('findAll', () => {
    it('queries every item joined to its category, ordered by category sortOrder then item createdAt/id', async () => {
      const items = [{ id: 'item-1' }, { id: 'item-2' }];
      queryBuilder.getMany.mockResolvedValue(items);

      const result = await service.findAll();

      expect(itemsRepository.createQueryBuilder).toHaveBeenCalledWith('item');
      expect(queryBuilder.leftJoin).toHaveBeenCalledWith('item.category', 'category');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('category.sortOrder', 'ASC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('item.createdAt', 'ASC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('item.id', 'ASC');
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toBe(items);
    });
  });

  // T05/VC-003 — available-items query method: same shape, filtered to
  // isAvailable items only.
  describe('findAvailable', () => {
    it('adds an isAvailable=true filter on top of the same ordered query', async () => {
      const items = [{ id: 'item-1', isAvailable: true }];
      queryBuilder.getMany.mockResolvedValue(items);

      const result = await service.findAvailable();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('item.isAvailable = :isAvailable', {
        isAvailable: true,
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('category.sortOrder', 'ASC');
      expect(result).toBe(items);
    });
  });

  // T06 — AC3/AC4: partial update via a mocked repository. The actual
  // "toggling changes what findAvailable()/findAll() return" proof lives in
  // menu-item.service.int-spec.ts against real Postgres, per this task's own
  // instructions; this level proves update()'s own field-merge and
  // validation logic in isolation.
  describe('update', () => {
    const existingItem = {
      id: 'item-1',
      categoryId: 'cat-1',
      name: 'Espresso',
      description: null,
      price: 3.5,
      isAvailable: true,
      imageUrl: null,
    };

    // AC3 — marking an item unavailable: isAvailable flips to false, every
    // other field on the entity is left untouched (partial update, not a
    // full replace).
    it('AC3: toggles isAvailable to false and leaves other fields untouched', async () => {
      itemsRepository.findOneBy.mockResolvedValue({ ...existingItem });
      itemsRepository.save.mockImplementation((item) => Promise.resolve(item));

      const result = await service.update('item-1', { isAvailable: false });

      expect(itemsRepository.findOneBy).toHaveBeenCalledWith({ id: 'item-1' });
      expect(itemsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ...existingItem, isAvailable: false }),
      );
      expect(result.isAvailable).toBe(false);
      expect(result.name).toBe('Espresso');
    });

    // AC4 — an unavailable item can be marked available again: same method,
    // the opposite boolean, starting from an already-unavailable item.
    it('AC4: toggles isAvailable back to true', async () => {
      itemsRepository.findOneBy.mockResolvedValue({ ...existingItem, isAvailable: false });
      itemsRepository.save.mockImplementation((item) => Promise.resolve(item));

      const result = await service.update('item-1', { isAvailable: true });

      expect(itemsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isAvailable: true }),
      );
      expect(result.isAvailable).toBe(true);
    });

    // Not-found (unpinned by any AC/VC — a defensible 404 default, see
    // scaffold/memory/DECISIONS.md "cafe-menu-management T06"): no row for
    // the given id, save() never called.
    it('rejects an id that does not reference an existing item, without writing', async () => {
      itemsRepository.findOneBy.mockResolvedValue(null);

      let caught: unknown;
      try {
        await service.update('missing-id', { isAvailable: false });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(NotFoundException);
      expect((caught as NotFoundException).message).toBe(cafe.MENU_ITEM_NOT_FOUND_MESSAGE);
      expect(itemsRepository.save).not.toHaveBeenCalled();
    });

    // AC5 still applies to an update — a categoryId present in the PATCH
    // body is re-checked against categoriesRepository, same as create()'s
    // check, before it's applied to the entity.
    it('rejects a categoryId that does not reference an existing category, without writing', async () => {
      itemsRepository.findOneBy.mockResolvedValue({ ...existingItem });
      categoriesRepository.exists.mockResolvedValue(false);

      let caught: unknown;
      try {
        await service.update('item-1', { categoryId: 'ghost-cat' });
      } catch (error) {
        caught = error;
      }

      expect(categoriesRepository.exists).toHaveBeenCalledWith({ where: { id: 'ghost-cat' } });
      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);
      expect(itemsRepository.save).not.toHaveBeenCalled();
    });

    // A valid, existing categoryId is applied to the entity, same as any
    // other patched field.
    it('applies a categoryId that does reference an existing category', async () => {
      itemsRepository.findOneBy.mockResolvedValue({ ...existingItem });
      categoriesRepository.exists.mockResolvedValue(true);
      itemsRepository.save.mockImplementation((item) => Promise.resolve(item));

      const result = await service.update('item-1', { categoryId: 'cat-2' });

      expect(result.categoryId).toBe('cat-2');
    });

    // Fields omitted from the PATCH body are left unchanged — proves this is
    // a genuine partial update, not one that resets untouched fields to
    // undefined/null.
    it('leaves fields absent from the request body unchanged', async () => {
      itemsRepository.findOneBy.mockResolvedValue({ ...existingItem });
      itemsRepository.save.mockImplementation((item) => Promise.resolve(item));

      const result = await service.update('item-1', { isAvailable: false });

      expect(result.name).toBe('Espresso');
      expect(result.price).toBe(3.5);
      expect(result.categoryId).toBe('cat-1');
    });
  });
});
