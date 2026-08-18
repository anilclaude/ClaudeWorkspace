import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from './db';

// Smoke test for the integration harness itself. It proves the pieces the
// first real DB-backed feature will depend on: the test database is reachable,
// migrations apply, and truncation is scoped correctly.
//
// Without this, the harness would go unexercised until someone's feature test
// failed for reasons that had nothing to do with their feature.
describe('integration test harness', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    // Drop the raw probe table even if an assertion above threw, so a failed
    // run doesn't leave state for the next run to trip over.
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
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_migrations'`,
    );
    expect(tables).toHaveLength(1);
  });

  // The database is shared across every backend service (platform_db, one
  // schema) — this is the regression test for the bug that shape introduces:
  // truncateAll() must only ever touch tables this service's own entities
  // declare, never anything else sitting in the same schema. A raw
  // non-entity table stands in for "another service's table" here, since
  // this service has no real entities yet to prove the positive case with.
  it('does not touch tables outside its own entities when truncating', async () => {
    const ds = getTestDataSource();
    await ds.query('CREATE TABLE IF NOT EXISTS other_service_table (id serial primary key)');
    await ds.query('INSERT INTO other_service_table DEFAULT VALUES');

    await truncateAll();

    const rows = await ds.query('SELECT count(*)::int AS n FROM other_service_table');
    expect(rows).toEqual([{ n: 1 }]);
  });
});
