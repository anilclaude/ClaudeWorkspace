import { cafe } from '@app/contracts';
import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from '../../test/db';
import { MenuItemService } from './menu-item.service';
import { MenuCategoryService } from './menu-category.service';
import { MenuItem } from './entities/menu-item.entity';
import { MenuCategory } from './entities/menu-category.entity';

// Integration coverage for T04's service layer (AC1, AC2, AC5) against a
// real Postgres connection, mirroring menu-category.service.int-spec.ts's
// harness usage — proves MenuItemService's repository calls actually
// persist correctly, including the real FK constraint and the
// numericColumnTransformer's round-trip, not just the mocked calls in
// menu-item.service.spec.ts.
describe('MenuItemService (integration)', () => {
  let itemService: MenuItemService;
  let categoryService: MenuCategoryService;

  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const dataSource = getTestDataSource();
    itemService = new MenuItemService(
      dataSource.getRepository(MenuItem),
      dataSource.getRepository(MenuCategory),
    );
    categoryService = new MenuCategoryService(dataSource.getRepository(MenuCategory));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // AC1/AC5 — a well-formed request against a real category persists, and
  // price round-trips as a real number (not a string), proving the
  // numericColumnTransformer works against a real `RETURNING` value, not
  // just the JS object passed in.
  it('creates an item against a real category and returns a real number price', async () => {
    const category = await categoryService.create({ name: 'Starters' });

    const item = await itemService.create({
      name: 'Espresso',
      categoryId: category.id,
      price: 3.5,
    });

    expect(item.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(item.categoryId).toBe(category.id);
    expect(typeof item.price).toBe('number');
    expect(item.price).toBe(3.5);

    const reloaded = await getTestDataSource().getRepository(MenuItem).findOneByOrFail({ id: item.id });
    expect(typeof reloaded.price).toBe('number');
    expect(reloaded.price).toBe(3.5);
  });

  // AC5 — categoryId well-formed but not a real category: rejected with a
  // clean application-level error, never reaching the DB's FK constraint.
  it('rejects a categoryId that does not reference an existing category, and persists nothing', async () => {
    await expect(
      itemService.create({
        name: 'Orphan',
        categoryId: '00000000-0000-0000-0000-000000000000',
        price: 1,
      }),
    ).rejects.toThrow(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);

    const count = await getTestDataSource().getRepository(MenuItem).count();
    expect(count).toBe(0);
  });

  // description/imageUrl optional per the contract — persisted as null when
  // omitted, matching the entity's nullable columns.
  it('persists null description and imageUrl when omitted', async () => {
    const category = await categoryService.create({ name: 'Beverages' });

    const item = await itemService.create({
      name: 'Tea',
      categoryId: category.id,
      price: 2,
    });

    expect(item.description).toBeNull();
    expect(item.imageUrl).toBeNull();
  });

  // T05 — admin view (findAll) returns every item regardless of
  // availability, ordered by category sortOrder then item creation order
  // within a category (see menu-item.service.ts's orderedQuery() comment).
  // Real Postgres round-trip, not the mocked query builder in
  // menu-item.service.spec.ts.
  describe('findAll', () => {
    it('returns every item ordered by category sortOrder then creation order, including unavailable items', async () => {
      const mains = await categoryService.create({ name: 'Mains' });
      const starters = await categoryService.create({ name: 'Starters' });

      const springRolls = await itemService.create({ name: 'Spring Rolls', categoryId: starters.id, price: 5 });
      const garlicBread = await itemService.create({ name: 'Garlic Bread', categoryId: starters.id, price: 4 });
      const grilledChicken = await itemService.create({ name: 'Grilled Chicken', categoryId: mains.id, price: 12 });

      await getTestDataSource()
        .getRepository(MenuItem)
        .update(springRolls.id, { isAvailable: false });

      const items = await itemService.findAll();

      // starters was created after mains, but has the lower sortOrder
      // (created first via categoryService.create()'s append-to-end
      // behavior) — mains.sortOrder=0, starters.sortOrder=1, so mains'
      // items come first, then starters' two items in creation order.
      expect(items.map((item) => item.id)).toEqual([grilledChicken.id, springRolls.id, garlicBread.id]);
      // Unavailable item stays present in the admin view (AC3).
      expect(items.find((item) => item.id === springRolls.id)?.isAvailable).toBe(false);
    });

    it('returns an empty array when no items exist', async () => {
      const items = await itemService.findAll();
      expect(items).toEqual([]);
    });
  });

  // T05/VC-003 — available-items query method: absent from this list but
  // present in findAll()'s, in the same request cycle (same DB state, two
  // separate calls against it).
  describe('findAvailable', () => {
    it('excludes an item marked unavailable while findAll() still includes it', async () => {
      const category = await categoryService.create({ name: 'Mains' });
      const available = await itemService.create({ name: 'Grilled Chicken', categoryId: category.id, price: 12 });
      const unavailable = await itemService.create({ name: 'Veg Burger', categoryId: category.id, price: 9 });

      await getTestDataSource().getRepository(MenuItem).update(unavailable.id, { isAvailable: false });

      const availableItems = await itemService.findAvailable();
      const allItems = await itemService.findAll();

      expect(availableItems.map((item) => item.id)).toEqual([available.id]);
      expect(allItems.map((item) => item.id)).toEqual([available.id, unavailable.id]);
    });

    it('returns an empty array when no items are available', async () => {
      const items = await itemService.findAvailable();
      expect(items).toEqual([]);
    });
  });

  // T06 — AC3/AC4: the availability toggle's actual DB-level effect, proven
  // against real Postgres, mirroring findAvailable()'s VC-003 precedent
  // directly above (same DB state, two separate read calls in the same
  // request cycle).
  describe('update', () => {
    // AC3 — marking an item unavailable hides it from findAvailable() (the
    // ordering-screen read path) but keeps it visible in findAll() (the
    // admin list), in the same request cycle.
    it('AC3: toggling isAvailable to false removes the item from findAvailable() while findAll() still includes it', async () => {
      const category = await categoryService.create({ name: 'Mains' });
      const item = await itemService.create({ name: 'Grilled Chicken', categoryId: category.id, price: 12 });

      const updated = await itemService.update(item.id, { isAvailable: false });
      expect(updated.isAvailable).toBe(false);

      const availableItems = await itemService.findAvailable();
      const allItems = await itemService.findAll();

      expect(availableItems.map((i) => i.id)).not.toContain(item.id);
      expect(allItems.map((i) => i.id)).toContain(item.id);
      expect(allItems.find((i) => i.id === item.id)?.isAvailable).toBe(false);
    });

    // AC4 — an unavailable item can be marked available again at any time:
    // toggling isAvailable back to true makes it reappear in
    // findAvailable(), still present in findAll() throughout.
    it('AC4: toggling isAvailable back to true restores the item to findAvailable()', async () => {
      const category = await categoryService.create({ name: 'Mains' });
      const item = await itemService.create({ name: 'Grilled Chicken', categoryId: category.id, price: 12 });
      await itemService.update(item.id, { isAvailable: false });

      const updated = await itemService.update(item.id, { isAvailable: true });
      expect(updated.isAvailable).toBe(true);

      const availableItems = await itemService.findAvailable();
      const allItems = await itemService.findAll();

      expect(availableItems.map((i) => i.id)).toContain(item.id);
      expect(allItems.map((i) => i.id)).toContain(item.id);
    });

    // Not-found (unpinned by any AC/VC — a defensible 404 default, see
    // scaffold/memory/DECISIONS.md "cafe-menu-management T06").
    it('rejects an id that does not reference an existing item', async () => {
      await expect(
        itemService.update('00000000-0000-0000-0000-000000000000', { isAvailable: false }),
      ).rejects.toThrow(cafe.MENU_ITEM_NOT_FOUND_MESSAGE);
    });

    // AC5 still applies to an update — a categoryId in the PATCH body that
    // doesn't reference a real category is rejected, and the item is left
    // unchanged in the database (not partially written).
    it('rejects a categoryId that does not reference an existing category, and leaves the item unchanged', async () => {
      const category = await categoryService.create({ name: 'Mains' });
      const item = await itemService.create({ name: 'Grilled Chicken', categoryId: category.id, price: 12 });

      await expect(
        itemService.update(item.id, { categoryId: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toThrow(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);

      const reloaded = await getTestDataSource().getRepository(MenuItem).findOneByOrFail({ id: item.id });
      expect(reloaded.categoryId).toBe(category.id);
    });

    // Partial update: fields absent from the PATCH body survive unchanged in
    // the database, not just in the in-memory return value.
    it('leaves fields absent from the request body unchanged in the database', async () => {
      const category = await categoryService.create({ name: 'Mains' });
      const item = await itemService.create({ name: 'Grilled Chicken', categoryId: category.id, price: 12 });

      await itemService.update(item.id, { isAvailable: false });

      const reloaded = await getTestDataSource().getRepository(MenuItem).findOneByOrFail({ id: item.id });
      expect(reloaded.name).toBe('Grilled Chicken');
      expect(reloaded.price).toBe(12);
      expect(reloaded.categoryId).toBe(category.id);
    });
  });
});
