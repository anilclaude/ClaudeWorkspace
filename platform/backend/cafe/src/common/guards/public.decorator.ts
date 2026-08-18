import { SetMetadata } from '@nestjs/common';

// The one explicit "no role required" marker. Needed alongside @RequireRoles
// so T03's build-time check (VC-004) can tell "genuinely unguarded, ship-time
// bug" apart from "deliberately open, logged in only or not even that" — an
// endpoint must carry one decorator or the other, never neither.
export const IS_PUBLIC_KEY = 'cafe:isPublic';

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
