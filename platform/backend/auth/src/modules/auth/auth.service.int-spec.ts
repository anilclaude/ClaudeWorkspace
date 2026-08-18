import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { closeTestDb, getTestDataSource, initTestDb, truncateAll } from '../../test/db';
import { env } from '../../config';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';

// Integration coverage for T03 against a real Postgres database — this task
// touches real credential-check logic (bcrypt hashing and the
// `LOWER(email)`-matching lookup from T02's migration) that a mocked
// repository in auth.service.spec.ts can assert the shape of, but can't
// prove actually matches what the real functional index enforces.
describe('AuthService (integration)', () => {
  let service: AuthService;

  beforeAll(async () => {
    await initTestDb();
    service = new AuthService(getTestDataSource().getRepository(User));
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // AC1 — a real bcrypt-hashed password, read back through the real
  // case-insensitive lookup, produces a verifiable session token.
  it('authenticates a registered user against their real stored hash (AC1)', async () => {
    const repo = getTestDataSource().getRepository(User);
    const passwordHash = await bcrypt.hash('correct-horse-battery-staple', 10);
    const saved = await repo.save(
      repo.create({ email: 'Ada@Example.com', passwordHash }),
    );

    // Typed with different casing than stored — must still match the
    // LOWER(email) functional index this lookup is written against.
    const result = await service.login({
      email: 'ada@example.com',
      password: 'correct-horse-battery-staple',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.data.user).toEqual({ id: saved.id, email: 'Ada@Example.com' });
    expect(jwt.verify(result.data.token, env.JWT_SECRET)).toMatchObject({ sub: saved.id });
  });

  // T00 — a real row with a role assigned signs that role onto the token,
  // read back through the real repository (not a mock).
  it('signs the role claim from the real stored column value (T00)', async () => {
    const repo = getTestDataSource().getRepository(User);
    const passwordHash = await bcrypt.hash('correct-horse-battery-staple', 10);
    await repo.save(
      repo.create({ email: 'kitchen@example.com', passwordHash, role: 'Kitchen' }),
    );

    const result = await service.login({
      email: 'kitchen@example.com',
      password: 'correct-horse-battery-staple',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(jwt.verify(result.data.token, env.JWT_SECRET)).toMatchObject({ role: 'Kitchen' });
  });

  // T00 — a real row with no role assigned (nullable column, no default —
  // the same shape every existing hand-created account has) signs role:
  // null, not an omitted claim or a guessed default.
  it('signs role: null from a real row with no role assigned (T00)', async () => {
    const repo = getTestDataSource().getRepository(User);
    const passwordHash = await bcrypt.hash('correct-horse-battery-staple', 10);
    await repo.save(repo.create({ email: 'no-role@example.com', passwordHash }));

    const result = await service.login({
      email: 'no-role@example.com',
      password: 'correct-horse-battery-staple',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(jwt.verify(result.data.token, env.JWT_SECRET)).toMatchObject({ role: null });
  });

  // AC2 — wrong password against a real stored hash still yields the
  // uniform error.
  it('rejects a real user with the wrong password (AC2)', async () => {
    const repo = getTestDataSource().getRepository(User);
    const passwordHash = await bcrypt.hash('correct-horse-battery-staple', 10);
    await repo.save(repo.create({ email: 'ada@example.com', passwordHash }));

    const result = await service.login({ email: 'ada@example.com', password: 'wrong-guess' });

    expect(result).toEqual({
      success: false,
      data: null,
      error: { message: 'Email or password is incorrect', code: 'INVALID_CREDENTIALS' },
    });
  });

  // AC2 — an email with no row at all yields the identical uniform error,
  // proving the real query (not just the mock) returns null rather than
  // throwing or producing a distinct shape.
  it('rejects an unregistered email with the same uniform error (AC2)', async () => {
    const result = await service.login({
      email: 'nobody@example.com',
      password: 'irrelevant',
    });

    expect(result).toEqual({
      success: false,
      data: null,
      error: { message: 'Email or password is incorrect', code: 'INVALID_CREDENTIALS' },
    });
  });
});
