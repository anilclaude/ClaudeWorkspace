import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Integration-test database lifecycle.
//
// Mirrors backend/auth/src/test/db.ts exactly (T02 — first entities/migration
// in backend/cafe, so this is where the harness lands here too). Service-local
// for now; when a second service needs this, promote it to backend/libs/testing
// per repo-structure.md's promotion path rather than copying it again.

let dataSource: DataSource | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — check backend/cafe/.env.test.`);
  }
  return value;
}

function build(): DataSource {
  const database = required('POSTGRES_DB');
  // Guard against a misconfigured .env.test pointing at the dev database —
  // truncateAll() would silently wipe real data.
  if (!database.endsWith('_test_db')) {
    throw new Error(
      `Refusing to run integration tests against "${database}". ` +
        'POSTGRES_DB must end in _test_db — check backend/cafe/.env.test.',
    );
  }

  return new DataSource({
    type: 'postgres',
    host: required('POSTGRES_HOST'),
    port: Number(required('POSTGRES_PORT')),
    database,
    username: required('POSTGRES_USER'),
    password: required('POSTGRES_PASSWORD'),
    entities: [`${__dirname}/../modules/**/entities/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/../db/migrations/*{.ts,.js}`],
    // Must match src/db/data-source.ts and app.module.ts exactly — this is
    // the third of three places a DataSource gets built for this service, and
    // the database is shared across every backend service, so a mismatch here
    // wouldn't just be inconsistent, it'd point this test harness at a table
    // another service also thinks is its own migration history.
    migrationsTableName: 'cafe_migrations',
  });
}

/**
 * Connect and bring the schema up to date. Call once per suite in beforeAll.
 * Throws an actionable message if Postgres isn't reachable — integration tests
 * fail loudly rather than passing vacuously against no database.
 */
export async function initTestDb(): Promise<DataSource> {
  if (dataSource?.isInitialized) return dataSource;

  dataSource = build();
  try {
    await dataSource.initialize();
  } catch (cause) {
    throw new Error(
      'Could not connect to the test database. Start it with `pnpm db:up` ' +
        'from platform/, then re-run. Integration tests are not skipped ' +
        'silently — a missing database is a failure, not a pass.',
      { cause },
    );
  }
  await dataSource.runMigrations();
  return dataSource;
}

/**
 * Empty every table this service owns. Call in beforeEach — without it, test 2
 * sees test 1's rows and can pass for the wrong reason, which is the
 * vacuous-green-test problem R1 exists to catch.
 *
 * Scoped to `dataSource.entityMetadatas` — the tables THIS service's entity
 * glob declares — rather than every table in the schema. The database is
 * shared across every backend service (platform_db, one schema), so querying
 * pg_tables broadly would truncate other services' tables too. Scoping by
 * entity metadata is correct regardless of what else is in the schema; it
 * doesn't depend on a naming convention someone could forget to follow.
 */
export async function truncateAll(): Promise<void> {
  if (!dataSource?.isInitialized) return;

  const tableNames = dataSource.entityMetadatas.map((m) => m.tableName);
  if (tableNames.length === 0) return;

  const list = tableNames.map((t) => `"public"."${t}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Close the connection. Call once per suite in afterAll, or Jest won't exit. */
export async function closeTestDb(): Promise<void> {
  if (dataSource?.isInitialized) await dataSource.destroy();
  dataSource = null;
}

export function getTestDataSource(): DataSource {
  if (!dataSource?.isInitialized) {
    throw new Error('Test database not initialized — call initTestDb() in beforeAll.');
  }
  return dataSource;
}
