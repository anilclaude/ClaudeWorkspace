import { describe, it, expect } from 'vitest';
import {
  AUTH_ROUTES,
  loginRequestSchema,
  loginResponseSchema,
  loginErrorSchema,
  LOGIN_INVALID_CREDENTIALS_MESSAGE,
  cafeRoleSchema,
} from './index';

describe('auth contracts — POST /auth/login', () => {
  it('exposes the login route', () => {
    expect(AUTH_ROUTES.login).toBe('/auth/login');
  });

  describe('loginRequestSchema', () => {
    it('accepts a well-formed email and non-empty password', () => {
      const parsed = loginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'correct-horse',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects a malformed email', () => {
      const parsed = loginRequestSchema.safeParse({
        email: 'not-an-email',
        password: 'correct-horse',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects an empty password', () => {
      const parsed = loginRequestSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects an email over 255 characters', () => {
      // 255 is the standard email length ceiling — an unbounded email gets
      // handed straight to a DB lookup/bcrypt.compare, so this caps the
      // validation boundary rather than letting an arbitrarily long string
      // through.
      const localPart = 'a'.repeat(250);
      const overLongEmail = `${localPart}@example.com`; // > 255 chars total
      expect(overLongEmail.length).toBeGreaterThan(255);

      const parsed = loginRequestSchema.safeParse({
        email: overLongEmail,
        password: 'correct-horse',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects a password over 72 bytes', () => {
      // 72 is bcrypt's own hard limit — anything longer is silently
      // truncated by bcrypt itself, so the schema rejects it outright
      // instead of accepting a string bcrypt would quietly truncate.
      const overLongPassword = 'a'.repeat(73);

      const parsed = loginRequestSchema.safeParse({
        email: 'user@example.com',
        password: overLongPassword,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('loginResponseSchema — AC1 success branch', () => {
    it('accepts a token plus user, and never carries an error', () => {
      const parsed = loginResponseSchema.safeParse({
        success: true,
        data: { token: 'signed-jwt', user: { id: 'u-1', email: 'user@example.com' } },
        error: null,
      });
      expect(parsed.success).toBe(true);
    });

    it('strips a passwordHash field from the user payload', () => {
      // The user shape is closed to id/email — this documents that a raw
      // entity (with passwordHash) is not a valid response, per B5.
      const parsed = loginResponseSchema.safeParse({
        success: true,
        data: {
          token: 'signed-jwt',
          user: { id: 'u-1', email: 'user@example.com', passwordHash: '$2b$10$abc' },
        },
        error: null,
      });
      // Zod objects are non-strict by default (extra keys stripped, not
      // rejected), so this still parses — but the parsed output must not
      // retain passwordHash.
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.success) {
        expect(parsed.data.data.user).not.toHaveProperty('passwordHash');
      }
    });

    it('rejects a success envelope carrying an error', () => {
      const parsed = loginResponseSchema.safeParse({
        success: true,
        data: { token: 'signed-jwt', user: { id: 'u-1', email: 'user@example.com' } },
        error: { message: LOGIN_INVALID_CREDENTIALS_MESSAGE, code: 'INVALID_CREDENTIALS' },
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('loginResponseSchema — AC2 uniform credential-mismatch error', () => {
    it('accepts the uniform error for a wrong password', () => {
      const parsed = loginResponseSchema.safeParse({
        success: false,
        data: null,
        error: { message: LOGIN_INVALID_CREDENTIALS_MESSAGE, code: 'INVALID_CREDENTIALS' },
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects an unregistered-email error that uses a distinct message instead of the uniform one', () => {
      // AC2's guarantee is that the schema only ever admits the single
      // uniform literal — an "unregistered email" branch that tried to say
      // something more specific (revealing that no account exists) must be
      // rejected by loginErrorSchema/loginResponseSchema, same as any other
      // off-literal message would be.
      const distinctMessage = loginErrorSchema.safeParse({
        message: 'This email is not registered',
        code: 'INVALID_CREDENTIALS',
      });
      expect(distinctMessage.success).toBe(false);

      const envelope = loginResponseSchema.safeParse({
        success: false,
        data: null,
        error: { message: 'This email is not registered', code: 'INVALID_CREDENTIALS' },
      });
      expect(envelope.success).toBe(false);

      // The uniform literal remains the only accepted shape for both branches.
      const uniform = loginErrorSchema.safeParse({
        message: LOGIN_INVALID_CREDENTIALS_MESSAGE,
        code: 'INVALID_CREDENTIALS',
      });
      expect(uniform.success).toBe(true);
    });

    it('rejects any error message other than the uniform AC2 string', () => {
      const parsed = loginResponseSchema.safeParse({
        success: false,
        data: null,
        error: { message: 'No account found for that email', code: 'INVALID_CREDENTIALS' },
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects a failure envelope carrying data', () => {
      const parsed = loginResponseSchema.safeParse({
        success: false,
        data: { token: 'signed-jwt', user: { id: 'u-1', email: 'user@example.com' } },
        error: { message: LOGIN_INVALID_CREDENTIALS_MESSAGE, code: 'INVALID_CREDENTIALS' },
      });
      expect(parsed.success).toBe(false);
    });
  });

  // T00 (cafe-access-roles) — the role vocabulary the JWT `role` claim and
  // a future cafe-access-roles guard both validate against.
  describe('cafeRoleSchema', () => {
    it('accepts each of the five valid roles', () => {
      const roles = ['Admin', 'Manager', 'Cashier', 'Waiter', 'Kitchen'];
      for (const role of roles) {
        expect(cafeRoleSchema.safeParse(role).success).toBe(true);
      }
    });

    it('rejects a value outside the five valid roles', () => {
      const parsed = cafeRoleSchema.safeParse('SuperAdmin');
      expect(parsed.success).toBe(false);
    });

    it('rejects a lowercase variant of a valid role (case-sensitive)', () => {
      const parsed = cafeRoleSchema.safeParse('admin');
      expect(parsed.success).toBe(false);
    });

    it('rejects null and undefined', () => {
      expect(cafeRoleSchema.safeParse(null).success).toBe(false);
      expect(cafeRoleSchema.safeParse(undefined).success).toBe(false);
    });
  });
});
