import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { auth } from '@app/contracts';
import { env } from '../../config';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './require-roles.decorator';
import type { AuthenticatedRequest } from './authenticated-request';

const INVALID_TOKEN_MESSAGE = 'Missing or invalid authentication token';
const FORBIDDEN_MESSAGE = 'You do not have permission to perform this action';

function extractBearerToken(headerValue: string | string[] | undefined): string | null {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw) return null;
  const [scheme, token] = raw.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

// The core mechanism this task builds (cafe-access-roles AC1-AC4). Runs on
// every request to a handler wired up with @UseGuards(RolesGuard) — verifies
// the JWT from scratch (never jwt.decode(), see DECISIONS.md
// "cafe-access-roles T02 (pre-build review)") and checks the decoded role
// against the handler's declared @RequireRoles(...) list, unless the handler
// is marked @Public().
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const klass = context.getClass();

    // Method-level and class-level decorators are resolved as a unit, never
    // key-by-key independently — otherwise a class-level @Public() combined
    // with one method's @RequireRoles('Admin') would let getAllAndOverride's
    // per-key lookup resolve isPublic=true from the class before the
    // method's own @RequireRoles is ever read, silently unlocking that one
    // method (a real bypass, not hypothetical — both decorators are typed
    // MethodDecorator & ClassDecorator, so this combination is a documented,
    // reachable usage pattern). If *either* decorator is present at the
    // method level, the method level wins outright and the class level is
    // never consulted; only fall back to the class level when neither
    // decorator was declared on the method itself.
    const methodIsPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, handler);
    const methodRoles = this.reflector.get<auth.CafeRole[]>(ROLES_KEY, handler);
    const methodDecorated = methodIsPublic !== undefined || methodRoles !== undefined;

    const isPublic = methodDecorated
      ? methodIsPublic
      : this.reflector.get<boolean>(IS_PUBLIC_KEY, klass);

    if (isPublic) {
      return true;
    }

    // Endpoints that declare no @RequireRoles(...) at all (at whichever
    // level actually applies) default to an empty allow-list below, which
    // rejects every role — fail closed, never default-allow (PRD §3 AC5).
    // T03 enforces at build time that this case can't ship silently; this is
    // just this guard's own runtime backstop.
    const allowedRoles =
      (methodDecorated
        ? methodRoles
        : this.reflector.get<auth.CafeRole[]>(ROLES_KEY, klass)) ?? [];

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    // AC1 / VC-001 — no token at all.
    if (!token) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    let payload: jwt.JwtPayload;
    let staffId: string;
    try {
      // Verified from scratch — signature + algorithm pinned to HS256, never
      // jwt.decode(). An unverified-signature check here would let anyone
      // forge role: 'Admin'. Do not pattern-match
      // frontend/libs/core/src/session.ts's checkSession — that helper
      // deliberately skips signature verification and is documented as "not
      // a security boundary", which does not hold for a backend guard.
      const verified = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
      if (typeof verified === 'string' || !verified.sub) {
        throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
      }
      payload = verified;
      staffId = verified.sub;
    } catch {
      // AC1 / VC-001 — present but invalid: forged signature, wrong
      // algorithm, expired, or malformed. Same rejection branch as "no token
      // at all" — a bad token is not meaningfully different from no token.
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    // Never trust the JWT payload's static shape alone — an out-of-band SQL
    // write with a bad role value would otherwise reach a real, verifiable
    // token unchecked (T00 review note). A safeParse failure here covers both
    // an out-of-enum string and a missing/null role claim (T00's column is
    // nullable, no default) — both fall through to the exact same rejection
    // below as an allowed-but-wrong role, per AC4.
    const roleResult = auth.cafeRoleSchema.safeParse(payload.role);
    const role = roleResult.success ? roleResult.data : null;

    // AC2 / VC-002 (wrong role) and AC4 (unrecognized/missing role) are one
    // and the same branch on purpose — an invalid role is defined as "no
    // valid role", not a third outcome distinct from "wrong role".
    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }

    // AC3 / VC-003 — allowed. Attach the staff id from the verified token
    // (never the request body) so the rest of the handler can read it
    // without trusting client input.
    request.staffId = staffId;
    return true;
  }
}
