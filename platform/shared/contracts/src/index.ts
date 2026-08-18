// Cross-service and client-server contracts.
//
// Every contract is a Zod schema plus its inferred types. The service that
// serves the route validates with it; every consumer parses with it. There is
// no second definition anywhere — that is the whole point of this package.
//
// Convention: one folder per owning service. `auth/` holds contracts the auth
// service serves; a consumer imports from here, never from the service itself.

export * as auth from './auth';
export * as core from './core';
export * as cafe from './cafe';
export * from './common';
