import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { env } from '../../config';
import { RolesGuard } from './roles.guard';
import { RequireRoles } from './require-roles.decorator';
import { Public } from './public.decorator';
import type { AuthenticatedRequest } from './authenticated-request';

// A stand-in controller so the real @RequireRoles/@Public decorators attach
// real reflect-metadata to real method references — the guard is exercised
// through the same Reflector mechanism a real controller would use, not a
// hand-mocked metadata lookup.
class DummyController {
  @RequireRoles('Admin', 'Manager')
  adminOnly(): void {}

  @Public()
  openEndpoint(): void {}

  // Neither decorator at all — SHOULD-FIX 2: proves the fail-closed runtime
  // backstop for an undeclared endpoint, not just T03's future build-time
  // check.
  undeclared(): void {}
}

// Review cycle 1 BLOCKER regression fixture: a controller marked @Public()
// at the CLASS level, with one method deliberately locked down at the
// METHOD level via @RequireRoles(...). Before the fix, getAllAndOverride's
// per-key, independent resolution let the class-level @Public() short-circuit
// the guard before the method's own @RequireRoles() was ever read — a real,
// reachable authorization bypass through a documented decorator usage
// pattern (both decorators are typed MethodDecorator & ClassDecorator).
@Public()
class PublicClassController {
  @RequireRoles('Admin')
  lockedMethod(): void {}

  // No method-level decorator — must still fall back to the class-level
  // @Public() and stay open, proving the fix didn't break the legitimate
  // direction of the same fallback.
  openMethod(): void {}
}

function buildContext(
  handler: (...args: unknown[]) => unknown,
  request: AuthenticatedRequest,
  klass: new (...args: unknown[]) => unknown = DummyController,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

// Synthesized directly with jsonwebtoken.sign() against the real env.JWT_SECRET
// — no dependency on a live login endpoint (see DECISIONS.md, "cafe-access-roles
// T02 (pre-build review)").
function signToken(payload: Record<string, unknown>, secret: string = env.JWT_SECRET): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' });
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  // AC1 / VC-001 — no Authorization header at all -> 401.
  it('rejects with 401 when no token is present', () => {
    const request: AuthenticatedRequest = { headers: {} };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  // AC1 / VC-001 — a present-but-forged token (wrong signature) must be
  // rejected the same way as no token; this is exactly what jwt.verify(),
  // not jwt.decode(), exists to catch. Also proves the guard never trusts
  // the payload's claims (role: 'Admin') when the signature doesn't verify.
  it('rejects with 401 when the token signature does not verify', () => {
    const forged = signToken(
      { sub: 'staff-1', role: 'Admin' },
      'a-completely-different-secret-value',
    );
    const request: AuthenticatedRequest = { headers: { authorization: `Bearer ${forged}` } };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  // AC1 / VC-001 — a malformed Authorization header (no Bearer scheme) is
  // treated the same as no token, not passed through to jwt.verify().
  it('rejects with 401 when the Authorization header has no Bearer scheme', () => {
    const token = signToken({ sub: 'staff-1', role: 'Admin' });
    const request: AuthenticatedRequest = { headers: { authorization: token } };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  // AC2 / VC-002 — valid token, role recognized, but not in this endpoint's
  // allowed list -> 403, not silently ignored.
  it('rejects with 403 when the role is valid but not allowed for this endpoint', () => {
    const token = signToken({ sub: 'staff-1', role: 'Waiter' });
    const request: AuthenticatedRequest = { headers: { authorization: `Bearer ${token}` } };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  // AC3 / VC-003 — valid token, allowed role: succeeds, and the staff id
  // read from the verified token (never the request body) is attached to
  // the request for the rest of the handler to read.
  it('allows the request and attaches staffId from the token when the role is allowed', () => {
    const token = signToken({ sub: 'staff-1', role: 'Admin' });
    const request: AuthenticatedRequest = { headers: { authorization: `Bearer ${token}` } };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.staffId).toBe('staff-1');
  });

  // AC3 / VC-003 — the attached staffId always comes from the verified
  // token's sub claim, even if something else on the request object (e.g. a
  // spoofed body field) claims a different staff id — proves the guard
  // never reads that source.
  it('attaches staffId from the token even when the request carries a conflicting claim elsewhere', () => {
    const token = signToken({ sub: 'staff-1', role: 'Admin' });
    const request: AuthenticatedRequest & { body?: { staffId?: string } } = {
      headers: { authorization: `Bearer ${token}` },
      body: { staffId: 'staff-attacker-supplied' },
    };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    guard.canActivate(context);

    expect(request.staffId).toBe('staff-1');
  });

  // AC4 — an out-of-enum role string is treated as no valid role, landing in
  // the exact same rejection branch (ForbiddenException, identical message)
  // as AC2's wrong-role case, not a separate/third code path.
  it('rejects an unrecognized role the same way it rejects a disallowed role', () => {
    const unrecognizedToken = signToken({ sub: 'staff-1', role: 'SuperAdmin' });
    const unrecognizedContext = buildContext(DummyController.prototype.adminOnly, {
      headers: { authorization: `Bearer ${unrecognizedToken}` },
    });

    const disallowedToken = signToken({ sub: 'staff-1', role: 'Waiter' });
    const disallowedContext = buildContext(DummyController.prototype.adminOnly, {
      headers: { authorization: `Bearer ${disallowedToken}` },
    });

    let unrecognizedError: unknown;
    try {
      guard.canActivate(unrecognizedContext);
    } catch (error) {
      unrecognizedError = error;
    }
    let disallowedError: unknown;
    try {
      guard.canActivate(disallowedContext);
    } catch (error) {
      disallowedError = error;
    }

    expect(unrecognizedError).toBeInstanceOf(ForbiddenException);
    expect(disallowedError).toBeInstanceOf(ForbiddenException);
    expect((unrecognizedError as ForbiddenException).message).toBe(
      (disallowedError as ForbiddenException).message,
    );
  });

  // AC4 — a NULL role claim (T00's column is nullable, no default, so this
  // is a real reachable value, not a hypothetical) is treated identically:
  // same rejection branch, not a third path.
  it('rejects a null role claim the same way it rejects a disallowed role', () => {
    const token = signToken({ sub: 'staff-1', role: null });
    const request: AuthenticatedRequest = { headers: { authorization: `Bearer ${token}` } };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  // AC4 — a role claim missing entirely from the token (not even present as
  // a key) is the same as a NULL role — same rejection branch.
  it('rejects a token with no role claim at all the same way it rejects a disallowed role', () => {
    const token = signToken({ sub: 'staff-1' });
    const request: AuthenticatedRequest = { headers: { authorization: `Bearer ${token}` } };
    const context = buildContext(DummyController.prototype.adminOnly, request);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  // Supporting mechanism this task also builds: @Public() bypasses the guard
  // entirely — no token needed, and no staffId is attached, since nothing
  // was checked. Not an AC on its own, but T03's build-time check (AC5)
  // depends on this decorator existing and actually short-circuiting here.
  it('allows a @Public() handler through with no token at all', () => {
    const request: AuthenticatedRequest = { headers: {} };
    const context = buildContext(DummyController.prototype.openEndpoint, request);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.staffId).toBeUndefined();
  });

  // SHOULD-FIX 2 (review cycle 1) — an endpoint with neither @RequireRoles()
  // nor @Public() must reject even a fully valid, well-formed token: the
  // empty-allow-list runtime backstop this guard's own design relies on
  // until T03's build-time check exists (and as a defense in depth after).
  it('rejects a valid token with 403 when the handler declares neither @RequireRoles() nor @Public()', () => {
    const token = signToken({ sub: 'staff-1', role: 'Admin' });
    const request: AuthenticatedRequest = { headers: { authorization: `Bearer ${token}` } };
    const context = buildContext(DummyController.prototype.undeclared, request);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  // BLOCKER regression (review cycle 1) — a method-level @RequireRoles(...)
  // must win outright over a class-level @Public(), not be silently ignored
  // by it. Reproduces the exact bypass the reviewer found: a controller
  // marked @Public() at the class level, with one method locked down by
  // @RequireRoles('Admin'), must still reject a request with no token at
  // all on that method.
  it('rejects a no-token request to a method-level @RequireRoles() handler even when the class itself is @Public()', () => {
    const request: AuthenticatedRequest = { headers: {} };
    const context = buildContext(
      PublicClassController.prototype.lockedMethod,
      request,
      PublicClassController,
    );

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  // Same fixture, positive case: a method with no decorator of its own on
  // an otherwise @Public() class still correctly falls back to the
  // class-level @Public() and stays open — proves the fix (method level
  // wins only when the method actually declares something) didn't break
  // the legitimate class-level-@Public() pattern in the other direction.
  it('still allows a class-level @Public() to apply to a method with no decorator of its own', () => {
    const request: AuthenticatedRequest = { headers: {} };
    const context = buildContext(
      PublicClassController.prototype.openMethod,
      request,
      PublicClassController,
    );

    expect(guard.canActivate(context)).toBe(true);
  });
});
