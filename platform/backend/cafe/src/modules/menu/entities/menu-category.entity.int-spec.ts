import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from '../../../test/db';
import { MenuCategory } from './menu-category.entity';

// Integration coverage for T02 (MenuCategory entity + migration) —
// cafe-menu-management PRD §7. No AC binds directly to this task; these
// assertions are schema-level, proving the table exists with the right
// shape and constraints, exactly matching user.entity.int-spec.ts's pattern
// for the equivalent T02 in the login PRD.
describe('MenuCategory entity + migration', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // PRD §7's menu_categories table: id, name, sort_order — nothing else.
  it('persists a category row with the PRD §7 fields', async () => {
    const repo = getTestDataSource().getRepository(MenuCategory);

    const saved = await repo.save(repo.create({ name: 'Starters', sortOrder: 0 }));

    expect(saved.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(saved.name).toBe('Starters');
    expect(saved.sortOrder).toBe(0);

    const reloaded = await repo.findOneByOrFail({ id: saved.id });
    expect(reloaded.name).toBe('Starters');
    expect(reloaded.sortOrder).toBe(0);
  });

  // `name` is NOT NULL in the migration — a row missing it must be rejected
  // by the database, not silently accepted with a null/empty value.
  it('rejects a category row with no name', async () => {
    const repo = getTestDataSource().getRepository(MenuCategory);

    await expect(
      repo.query('INSERT INTO menu_categories (sort_order) VALUES (0)'),
    ).rejects.toThrow();
  });

  // AC6 — categories can be reordered. Multiple categories, distinct
  // sort_order values, round-trip and sort as expected — the query shape
  // T07's reorder/T10's display will both depend on.
  it('orders categories by sort_order ascending', async () => {
    const repo = getTestDataSource().getRepository(MenuCategory);
    await repo.save(repo.create({ name: 'Mains', sortOrder: 1 }));
    await repo.save(repo.create({ name: 'Starters', sortOrder: 0 }));
    await repo.save(repo.create({ name: 'Beverages', sortOrder: 2 }));

    const ordered = await repo.find({ order: { sortOrder: 'ASC' } });

    expect(ordered.map((c) => c.name)).toEqual(['Starters', 'Mains', 'Beverages']);
  });
});
