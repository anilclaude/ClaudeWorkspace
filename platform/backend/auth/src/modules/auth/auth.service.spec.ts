import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import type { Repository } from 'typeorm';
import { env } from '../../config';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';

// Unit coverage for T03 (POST /auth/login — login PRD AC1/AC2). The
// repository is mocked so this suite never needs Postgres; a real-database
// pass over the same behavior lives in auth.service.int-spec.ts, since this
// task touches real credential-check logic (bcrypt + a case-insensitive
// lookup a mock can't fully vouch for).
describe('AuthService', () => {
  let service: AuthService;
  let queryBuilder: { where: jest.Mock; getOne: jest.Mock };

  const REGISTERED_EMAIL = 'ada@example.com';
  const CORRECT_PASSWORD = 'correct-horse-battery-staple';

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    const repository: Partial<Repository<User>> = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: getRepositoryToken(User), useValue: repository }],
    }).compile();

    service = module.get(AuthService);
  });

  // AC1 — registered email + correct password → active session (a signed
  // token) plus the signed-in user.
  it('returns a session token and the signed-in user for correct credentials', async () => {
    const passwordHash = await bcrypt.hash(CORRECT_PASSWORD, 4);
    queryBuilder.getOne.mockResolvedValue({
      id: 'user-1',
      email: REGISTERED_EMAIL,
      passwordHash,
      role: null,
    });

    const result = await service.login({ email: REGISTERED_EMAIL, password: CORRECT_PASSWORD });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.error).toBeNull();
    expect(result.data.user).toEqual({ id: 'user-1', email: REGISTERED_EMAIL });
    // passwordHash never leaves the service (B5) — the returned user is
    // exactly {id, email}, nothing else. role also does not appear on the
    // client-facing response body (T00 — only the JWT claim carries it).
    expect(Object.keys(result.data.user)).toEqual(['id', 'email']);

    const decoded = jwt.verify(result.data.token, env.JWT_SECRET);
    expect(decoded).toMatchObject({ sub: 'user-1', email: REGISTERED_EMAIL });
  });

  // T00 — the JWT payload carries the user's role as a distinct claim.
  it('signs the role claim onto the token when the user has a role', async () => {
    const passwordHash = await bcrypt.hash(CORRECT_PASSWORD, 4);
    queryBuilder.getOne.mockResolvedValue({
      id: 'user-1',
      email: REGISTERED_EMAIL,
      passwordHash,
      role: 'Kitchen',
    });

    const result = await service.login({ email: REGISTERED_EMAIL, password: CORRECT_PASSWORD });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    const decoded = jwt.verify(result.data.token, env.JWT_SECRET);
    expect(decoded).toMatchObject({ role: 'Kitchen' });
  });

  // T00 — a user with no role assigned yet (nullable column, no default)
  // signs role: null onto the token rather than omitting the claim or
  // guessing a default — a future guard must be able to tell "no role
  // assigned" apart from "claim never existed on this token version".
  it('signs role: null onto the token when the user has no role assigned', async () => {
    const passwordHash = await bcrypt.hash(CORRECT_PASSWORD, 4);
    queryBuilder.getOne.mockResolvedValue({
      id: 'user-1',
      email: REGISTERED_EMAIL,
      passwordHash,
      role: null,
    });

    const result = await service.login({ email: REGISTERED_EMAIL, password: CORRECT_PASSWORD });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    const decoded = jwt.verify(result.data.token, env.JWT_SECRET);
    expect(decoded).toMatchObject({ role: null });
  });

  // AC1 — the lookup must be case-insensitive to match the migration's
  // LOWER(email) unique index (see user.entity.ts); a typed-in casing
  // different from the stored casing still succeeds.
  it('looks up the account case-insensitively', async () => {
    const passwordHash = await bcrypt.hash(CORRECT_PASSWORD, 4);
    queryBuilder.getOne.mockResolvedValue({
      id: 'user-1',
      email: 'Ada@Example.com',
      passwordHash,
    });

    const result = await service.login({
      email: 'ADA@EXAMPLE.COM',
      password: CORRECT_PASSWORD,
    });

    expect(result.success).toBe(true);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(user.email) = LOWER(:email)',
      { email: 'ADA@EXAMPLE.COM' },
    );
  });

  // AC2 — a registered email with the wrong password gets the uniform error.
  it('returns the uniform error for a registered email with the wrong password', async () => {
    const passwordHash = await bcrypt.hash(CORRECT_PASSWORD, 4);
    queryBuilder.getOne.mockResolvedValue({
      id: 'user-1',
      email: REGISTERED_EMAIL,
      passwordHash,
    });

    const result = await service.login({ email: REGISTERED_EMAIL, password: 'wrong-password' });

    expect(result).toEqual({
      success: false,
      data: null,
      error: { message: 'Email or password is incorrect', code: 'INVALID_CREDENTIALS' },
    });
  });

  // AC2 — an unregistered email gets the exact same error.
  it('returns the uniform error for an unregistered email', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    const result = await service.login({
      email: 'nobody@example.com',
      password: CORRECT_PASSWORD,
    });

    expect(result).toEqual({
      success: false,
      data: null,
      error: { message: 'Email or password is incorrect', code: 'INVALID_CREDENTIALS' },
    });
  });

  // AC2 — the two failure causes must be indistinguishable in the response,
  // not merely similar-looking. Asserting deep equality between them is what
  // actually proves "does not reveal whether an account exists."
  it('returns byte-identical responses for a wrong password and an unregistered email', async () => {
    const passwordHash = await bcrypt.hash(CORRECT_PASSWORD, 4);
    queryBuilder.getOne.mockResolvedValueOnce({
      id: 'user-1',
      email: REGISTERED_EMAIL,
      passwordHash,
    });
    const wrongPasswordResult = await service.login({
      email: REGISTERED_EMAIL,
      password: 'wrong-password',
    });

    queryBuilder.getOne.mockResolvedValueOnce(null);
    const unregisteredResult = await service.login({
      email: 'nobody@example.com',
      password: CORRECT_PASSWORD,
    });

    expect(wrongPasswordResult).toEqual(unregisteredResult);
  });
});
