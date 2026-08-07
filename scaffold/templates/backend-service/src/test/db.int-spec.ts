import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from './db';

// Smoke test for the integration harness itself. It proves the pieces the
// first real DB-backed feature will depend on: the test database is reachable,
// migrations apply into THIS service's own namespaced table, and truncation
// is correctly scoped rather than sweeping the whole (shared) schema.
//
// Keep this file even after real feature tests exist — it's what catches a
// migrationsTableName mismatch before a feature test does.
describe('integration test harness', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await getTestDataSource()
      .query('DROP TABLE IF EXISTS other_service_table')
      .catch(() => undefined);
    await closeTestDb();
  });

  it('connects to the test database, not the dev database', async () => {
    const [{ current_database }] = await getTestDataSource().query('SELECT current_database()');
    expect(current_database).toBe('platform_test_db');
  });

  it('has applied migrations into this service’s own namespaced table', async () => {
    const tables = await getTestDataSource().query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = '__SERVICE_NAME___migrations'`,
    );
    expect(tables).toHaveLength(1);
  });

  // Regression test for the bug that motivated this template: truncateAll()
  // must only ever touch tables this service's own entities declare, never
  // anything else sitting in the shared schema. A raw non-entity table stands
  // in for "another service's table" here.
  it('does not touch tables outside its own entities when truncating', async () => {
    const ds = getTestDataSource();
    await ds.query('CREATE TABLE IF NOT EXISTS other_service_table (id serial primary key)');
    await ds.query('INSERT INTO other_service_table DEFAULT VALUES');

    await truncateAll();

    const rows = await ds.query('SELECT count(*)::int AS n FROM other_service_table');
    expect(rows).toEqual([{ n: 1 }]);
  });
});
