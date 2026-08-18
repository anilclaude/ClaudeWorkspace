import { SetMetadata } from '@nestjs/common';
import type { auth } from '@app/contracts';

// Declares the exact set of CafeRole values allowed to call a handler — AC5's
// "every café endpoint explicitly declares which role(s) it requires". The
// values are trusted only as *declared policy*; RolesGuard still validates
// the caller's actual role from the verified JWT against this list at request
// time, it never trusts anything the client sends.
export const ROLES_KEY = 'cafe:requiredRoles';

export const RequireRoles = (...roles: auth.CafeRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
