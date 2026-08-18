import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { cafe } from '@app/contracts';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategory } from './entities/menu-category.entity';

// Unit coverage for T03's service layer — infrastructure, no AC binds
// directly (see task-ledger-cafe-menu-management.md's T03 note). Repository
// is mocked here, mirroring backend/auth/src/modules/auth/auth.service.spec.ts's
// pattern; menu-category.service.int-spec.ts proves the same methods against
// a real Postgres connection.
describe('MenuCategoryService', () => {
  let service: MenuCategoryService;
  let repository: {
    find: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let transactionManager: { update: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    transactionManager = { update: jest.fn().mockResolvedValue(undefined), find: jest.fn() };
    repository = {
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      manager: {
        transaction: jest.fn(async (callback: (manager: typeof transactionManager) => Promise<unknown>) =>
          callback(transactionManager),
        ),
      },
    };
    const partialRepository: Partial<Repository<MenuCategory>> =
      repository as unknown as Partial<Repository<MenuCategory>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuCategoryService,
        { provide: getRepositoryToken(MenuCategory), useValue: partialRepository },
      ],
    }).compile();

    service = module.get(MenuCategoryService);
  });

  describe('findAll', () => {
    it('reads categories ordered by sortOrder ascending', async () => {
      const categories: MenuCategory[] = [
        { id: 'cat-1', name: 'Starters', sortOrder: 0 },
        { id: 'cat-2', name: 'Mains', sortOrder: 1 },
      ];
      repository.find.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ order: { sortOrder: 'ASC' } });
      expect(result).toEqual(categories);
    });
  });

  describe('create', () => {
    // sortOrder is server-assigned, appended to the end (contract comment on
    // createMenuCategoryRequestSchema) — proven here as "current row count".
    it('assigns sortOrder as the current category count, appending to the end', async () => {
      repository.count.mockResolvedValue(2);
      const created = { name: 'Beverages', sortOrder: 2 };
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue({ id: 'cat-3', ...created });

      const result = await service.create({ name: 'Beverages' });

      expect(repository.count).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith({ name: 'Beverages', sortOrder: 2 });
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual({ id: 'cat-3', name: 'Beverages', sortOrder: 2 });
    });

    it('assigns sortOrder 0 to the first category when none exist yet', async () => {
      repository.count.mockResolvedValue(0);
      repository.create.mockReturnValue({ name: 'Starters', sortOrder: 0 });
      repository.save.mockResolvedValue({ id: 'cat-1', name: 'Starters', sortOrder: 0 });

      await service.create({ name: 'Starters' });

      expect(repository.create).toHaveBeenCalledWith({ name: 'Starters', sortOrder: 0 });
    });
  });

  // T07 — AC6: categories can be reordered. Accept/reject symmetry per B2's
  // note: the happy path (an exact-match reorder is accepted and persisted)
  // and the guard path (a mismatched id set is rejected) are both proven
  // here, not just the rejection half.
  describe('reorderCategories', () => {
    const existingCategories: MenuCategory[] = [
      { id: 'cat-1', name: 'Starters', sortOrder: 0 },
      { id: 'cat-2', name: 'Mains', sortOrder: 1 },
      { id: 'cat-3', name: 'Beverages', sortOrder: 2 },
    ];

    // Accept half — a well-formed reorder (exact match of the current id
    // set, just a new order) is persisted inside a transaction: every row's
    // sortOrder is rewritten sequentially to its index in the request array,
    // and the reordered list is returned.
    it('rewrites sortOrder = array index for every category, inside a transaction, and returns the reordered list', async () => {
      repository.find.mockResolvedValue(existingCategories);
      const reordered: MenuCategory[] = [
        { id: 'cat-3', name: 'Beverages', sortOrder: 0 },
        { id: 'cat-1', name: 'Starters', sortOrder: 1 },
        { id: 'cat-2', name: 'Mains', sortOrder: 2 },
      ];
      transactionManager.find.mockResolvedValue(reordered);

      const result = await service.reorderCategories(['cat-3', 'cat-1', 'cat-2']);

      expect(repository.manager.transaction).toHaveBeenCalled();
      expect(transactionManager.update).toHaveBeenNthCalledWith(1, MenuCategory, { id: 'cat-3' }, { sortOrder: 0 });
      expect(transactionManager.update).toHaveBeenNthCalledWith(2, MenuCategory, { id: 'cat-1' }, { sortOrder: 1 });
      expect(transactionManager.update).toHaveBeenNthCalledWith(3, MenuCategory, { id: 'cat-2' }, { sortOrder: 2 });
      expect(transactionManager.find).toHaveBeenCalledWith(MenuCategory, { order: { sortOrder: 'ASC' } });
      expect(result).toEqual(reordered);
    });

    // Reject half — a request missing one of the current category ids is
    // rejected with a 400 naming MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE,
    // and nothing is written (no transaction opened).
    it('rejects a request missing one of the current category ids, without writing anything', async () => {
      repository.find.mockResolvedValue(existingCategories);

      let caught: unknown;
      try {
        await service.reorderCategories(['cat-1', 'cat-2']);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught as BadRequestException).message).toBe(cafe.MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE);
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });

    // Reject half — a request naming an id that isn't a real category is
    // rejected the same way, even when the array length matches.
    it('rejects a request containing an unknown category id, without writing anything', async () => {
      repository.find.mockResolvedValue(existingCategories);

      await expect(
        service.reorderCategories(['cat-1', 'cat-2', 'ghost-cat']),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });

    // Reject half — a duplicate id in the request (collapsing the requested
    // set below the real category count even though array length matches)
    // is rejected the same way.
    it('rejects a request with a duplicate category id, without writing anything', async () => {
      repository.find.mockResolvedValue(existingCategories);

      await expect(
        service.reorderCategories(['cat-1', 'cat-1', 'cat-3']),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });
  });
});
