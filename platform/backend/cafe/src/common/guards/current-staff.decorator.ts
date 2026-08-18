import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './authenticated-request';

// Exported separately from the decorator itself so it can be unit tested
// directly (Nest's createParamDecorator wraps a factory in a way that isn't
// otherwise invokable outside a real HTTP request/param-binding pipeline).
export function currentStaffFactory(
  _data: unknown,
  context: ExecutionContext,
): string | undefined {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.staffId;
}

// AC3 — lets a handler read the caller's staff id (attached by RolesGuard
// from the verified token) without touching req.staffId directly or trusting
// anything from the request body. Undefined only if used on a route that
// isn't behind RolesGuard (e.g. a @Public() route) — there is no staff
// identity to read there.
export const CurrentStaff = createParamDecorator(currentStaffFactory);
