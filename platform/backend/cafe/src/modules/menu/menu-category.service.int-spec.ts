import { cafe } from '@app/contracts';
import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from '../../test/db';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategory } from './entities/menu-category.entity';

// Integration coverage for T03's service layer against a real Postgres
// connection, mirroring menu-category.entity.int-spec.ts's (T02) harness
// usage — proves MenuCategoryService's repository calls (no raw SQL, per
// this task's requirement) actually persist and read back correctly, not
// just that the mocked calls in menu-category.service.spec.ts line up.
describe('MenuCategoryService (integration)', () => {
  let service: MenuCategoryService;

  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    service = new MenuCategoryService(getTestDataSource().getRepository(MenuCategory));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('creates categories with server-assigned, appended sortOrder', async () => {
    const first = await service.create({ name: 'Starters' });
    const second = await service.create({ name: 'Mains' });
    const third = await service.create({ name: 'Beverages' });

    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);
    expect(third.sortOrder).toBe(2);
    expect([first.id, second.id, third.id].every((id) => typeof id === 'string')).toBe(true);
  });

  it('lists categories ordered by sortOrder ascending, regardless of insert order', async () => {
    await service.create({ name: 'Starters' });
    await service.create({ name: 'Mains' });
    await service.create({ name: 'Beverages' });

    const all = await service.findAll();

    expect(all.map((c) => c.name)).toEqual(['Starters', 'Mains', 'Beverages']);
  });

  it('returns an empty list when no categories exist yet', async () => {
    const all = await service.findAll();

    expect(all).toEqual([]);
  });

  // T07 — AC6: categories can be reordered, and the persisted order
  // round-trips through findAll() correctly, mirroring T05/T06's int-spec
  // shape (real Postgres, not the mocked repository/manager in
  // menu-category.service.spec.ts).
  describe('reorderCategories', () => {
    // Accept half — a real reorder against real rows: every category's
    // sortOrder is rewritten to its index in the request array, and
    // findAll() (a separate read call, same DB state) reflects the new
    // order.
    it('AC6: persists the new order — findAll() reflects it in a separate read call', async () => {
      const starters = await service.create({ name: 'Starters' });
      const mains = await service.create({ name: 'Mains' });
      const beverages = await service.create({ name: 'Beverages' });

      const reordered = await service.reorderCategories([beverages.id, starters.id, mains.id]);

      expect(reordered.map((c) => c.id)).toEqual([beverages.id, starters.id, mains.id]);
      expect(reordered.map((c) => c.sortOrder)).toEqual([0, 1, 2]);

      const all = await service.findAll();
      expect(all.map((c) => c.id)).toEqual([beverages.id, starters.id, mains.id]);
      expect(all.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
    });

    // Reject half — a request missing one of the current category ids is
    // rejected, and no row's sortOrder is changed (proving the guard runs
    // before any write, not just that the transaction would roll back).
    it('rejects a request missing a current category id, and leaves every sortOrder unchanged', async () => {
      const starters = await service.create({ name: 'Starters' });
      const mains = await service.create({ name: 'Mains' });

      await expect(service.reorderCategories([mains.id])).rejects.toThrow(
        cafe.MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE,
      );

      const all = await service.findAll();
      expect(all.find((c) => c.id === starters.id)?.sortOrder).toBe(0);
      expect(all.find((c) => c.id === mains.id)?.sortOrder).toBe(1);
    });

    // Reject half — a request naming an id that isn't a real category is
    // rejected the same way, nothing written.
    it('rejects a request containing an unknown category id, and persists nothing', async () => {
      const starters = await service.create({ name: 'Starters' });

      await expect(
        service.reorderCategories([starters.id, '00000000-0000-0000-0000-000000000000']),
      ).rejects.toThrow(cafe.MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE);

      const all = await service.findAll();
      expect(all.find((c) => c.id === starters.id)?.sortOrder).toBe(0);
    });
  });
});
