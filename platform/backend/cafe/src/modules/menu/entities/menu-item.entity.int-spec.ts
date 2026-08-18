import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from '../../../test/db';
import { MenuCategory } from './menu-category.entity';
import { MenuItem } from './menu-item.entity';

// Integration coverage for T02 (MenuItem entity + migration) —
// cafe-menu-management PRD §7. No AC binds directly to this task; these
// assertions are schema-level (fields, FK behavior, defaults), the same
// pattern user.entity.int-spec.ts used for the equivalent T02 in the login
// PRD. AC1/AC2/AC5's request-level validation is T04's job (Zod, against
// createMenuItemRequestSchema) — this file only proves the table these
// endpoints will read/write is shaped correctly.
describe('MenuItem entity + migration', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  async function createCategory(name = 'Starters'): Promise<MenuCategory> {
    const repo = getTestDataSource().getRepository(MenuCategory);
    return repo.save(repo.create({ name, sortOrder: 0 }));
  }

  // PRD §7's menu_items table: id, category_id, name, description, price,
  // is_available, image_url, created_at, updated_at — every field the
  // contract's menuItemSchema declares.
  it('persists an item row with the PRD §7 fields', async () => {
    const category = await createCategory();
    const repo = getTestDataSource().getRepository(MenuItem);

    const saved = await repo.save(
      repo.create({
        categoryId: category.id,
        name: 'Espresso',
        description: 'Double shot',
        price: 3.5,
        imageUrl: 'https://example.com/espresso.jpg',
      }),
    );

    expect(saved.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(saved.categoryId).toBe(category.id);
    expect(saved.name).toBe('Espresso');
    expect(saved.description).toBe('Double shot');
    expect(saved.imageUrl).toBe('https://example.com/espresso.jpg');
    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.updatedAt).toBeInstanceOf(Date);

    const reloaded = await repo.findOneByOrFail({ id: saved.id });
    // numeric(10,2) round-trips through pg as a decimal-accurate value;
    // compared numerically rather than by strict type, since the exact JS
    // representation returned by the driver (string vs number) is a T04
    // read-path decision, not a T02 concern (see menu-item.entity.ts's
    // `price` comment).
    expect(Number(reloaded.price)).toBe(3.5);
  });

  // PRD §7 — is_available defaults to true; AC3/AC4's toggle is a later
  // task's concern, but the default itself is a migration-level fact.
  it('defaults isAvailable to true when not supplied', async () => {
    const category = await createCategory();
    const repo = getTestDataSource().getRepository(MenuItem);

    const saved = await repo.save(
      repo.create({ categoryId: category.id, name: 'Latte', price: 4 }),
    );

    expect(saved.isAvailable).toBe(true);
    const reloaded = await repo.findOneByOrFail({ id: saved.id });
    expect(reloaded.isAvailable).toBe(true);
  });

  // description and imageUrl are optional per the PRD/wireframe — persisting
  // an item without them must not fail.
  it('persists null description and imageUrl when not supplied', async () => {
    const category = await createCategory();
    const repo = getTestDataSource().getRepository(MenuItem);

    const saved = await repo.save(
      repo.create({ categoryId: category.id, name: 'Tea', price: 2 }),
    );

    expect(saved.description).toBeNull();
    expect(saved.imageUrl).toBeNull();
  });

  // AC5 — every item belongs to exactly one category: category_id is a
  // required FK, not nullable and not omittable.
  it('rejects an item with no category_id', async () => {
    const repo = getTestDataSource().getRepository(MenuItem);

    await expect(
      repo.query(`INSERT INTO menu_items (name, price) VALUES ('No Category', 1.00)`),
    ).rejects.toThrow();
  });

  // AC5 — category_id must reference a real category; a dangling FK is
  // rejected by the database, not silently accepted.
  it('rejects an item referencing a nonexistent category', async () => {
    const repo = getTestDataSource().getRepository(MenuItem);

    await expect(
      repo.save(
        repo.create({
          categoryId: '00000000-0000-0000-0000-000000000000',
          name: 'Orphan',
          price: 1,
        }),
      ),
    ).rejects.toThrow();
  });

  // The categoryId FK is ON DELETE RESTRICT (menu-item.entity.ts's comment,
  // logged as a T02 decision) — deleting a category with items attached must
  // fail rather than silently cascading or orphaning the item.
  it('rejects deleting a category that still has menu items', async () => {
    const category = await createCategory();
    const itemRepo = getTestDataSource().getRepository(MenuItem);
    await itemRepo.save(
      itemRepo.create({ categoryId: category.id, name: 'Croissant', price: 2.5 }),
    );

    const categoryRepo = getTestDataSource().getRepository(MenuCategory);
    await expect(categoryRepo.delete({ id: category.id })).rejects.toThrow();
  });
});
