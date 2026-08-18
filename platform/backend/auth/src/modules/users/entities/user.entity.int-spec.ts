import { initTestDb, truncateAll, closeTestDb, getTestDataSource } from '../../../test/db';
import { User } from './user.entity';

// Integration coverage for T02 (User entity + migration) — login PRD §4.
// AC1 and AC2 both depend on this table existing with the right shape and
// the right uniqueness guarantee, so the assertions here are schema-level,
// not endpoint-level (the endpoint itself is T03).
describe('User entity + migration', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // AC1 — a registered email + correct password redirects to a session. That
  // check reads a row shaped like this: id, email, passwordHash (never the
  // plain password), createdAt/updatedAt — exactly PRD §4's Data entities.
  it('persists a user row with the PRD §4 fields (AC1)', async () => {
    const repo = getTestDataSource().getRepository(User);

    const saved = await repo.save(
      repo.create({
        email: 'ada@example.com',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // bcrypt-shaped, never a plain password
      }),
    );

    expect(saved.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(saved.email).toBe('ada@example.com');
    expect(saved.passwordHash).toBe('$2b$10$abcdefghijklmnopqrstuv');
    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.updatedAt).toBeInstanceOf(Date);
  });

  // AC2 — the same "Email or password is incorrect" message covers both a
  // wrong password and an unregistered email, so the account lookup this
  // message depends on must be able to find the one existing row regardless
  // of the casing the user typed. A plain case-sensitive unique constraint
  // would let "ada@example.com" and "ADA@example.com" become two separate
  // rows (a duplicate account), which would silently break that guarantee.
  it('rejects a second account whose email differs only by case (AC2)', async () => {
    const repo = getTestDataSource().getRepository(User);
    await repo.save(repo.create({ email: 'ada@example.com', passwordHash: 'hash-one' }));

    await expect(
      repo.save(repo.create({ email: 'ADA@EXAMPLE.COM', passwordHash: 'hash-two' })),
    ).rejects.toThrow();
  });

  // T00 (cafe-access-roles) — the migration adds `role` as nullable with no
  // default. A row created the same way every existing account in this repo
  // is created (no role supplied) must persist with role: null, not a
  // guessed default and not a migration failure.
  it('persists role as null when not supplied, and does not default it (T00)', async () => {
    const repo = getTestDataSource().getRepository(User);

    const saved = await repo.save(
      repo.create({ email: 'no-role@example.com', passwordHash: 'hash' }),
    );

    expect(saved.role).toBeNull();

    const reloaded = await repo.findOneByOrFail({ id: saved.id });
    expect(reloaded.role).toBeNull();
  });

  // T00 — a valid role value round-trips through the real column.
  it('persists a valid CafeRole value (T00)', async () => {
    const repo = getTestDataSource().getRepository(User);

    const saved = await repo.save(
      repo.create({ email: 'kitchen@example.com', passwordHash: 'hash', role: 'Kitchen' }),
    );

    const reloaded = await repo.findOneByOrFail({ id: saved.id });
    expect(reloaded.role).toBe('Kitchen');
  });
});
