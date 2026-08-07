# frontend-module template

Copy `__feature_name__/` into `frontend/web/src/modules/`, then replace two
placeholders — they don't overlap, so replacing one is safe against the other:

- `__feature_name__` — lowercase, e.g. `orders` (file names, route segment,
  Redux slice name)
- `__FeatureName__` — PascalCase, e.g. `Orders` (type/interface names)

## Direct-to-service, no BFF layer

The browser calls the owning backend service directly — there's no
`src/app/api/` proxy route in between. This template's `api/` file composes
with `src/lib/services.ts`'s `authService()`/`coreService()`, which are
already contract-validated `@app/frontend-core` clients pointed at each
service's public `NEXT_PUBLIC_*` URL.

This only works because CORS is configured on the service side — see
`backend/<service>/src/main.ts`'s `CORS_ORIGIN`. If a new service is added and
its `CORS_ORIGIN` doesn't include this app's origin, every call from this
template's `api/` file fails at the browser before the request is even sent —
that's the thing to check first if a fetch here mysteriously never reaches
the service.

## Checklist after copying

- [ ] Both placeholders replaced, consistently
- [ ] `api/__feature_name__.client.ts` calls the correct service —
      `authService()` or `coreService()` from `src/lib/services.ts` — replace
      the placeholder import with whichever one actually owns this feature's
      data
- [ ] The route this feature's data lives at exists on that service (a real
      controller route, not the placeholder `/__feature_name__` path this
      template assumes)
- [ ] The slice registered in `src/store/index.ts` — that file's own comment
      says where: *"Feature modules register their own slices here as they land."*
- [ ] The schema in `schemas/` matches the real contract in
      `shared/contracts/src/<service>/` — a local guess that's never checked
      against the actual backend response is exactly what R6's conformance
      sweep looks for
- [ ] If this feature needs a route, add it to `(app)/layout.tsx`'s `navItems`
      — not `layout.tsx` (root), which deliberately carries no nav so `(auth)`
      routes stay chrome-free

## What you get

`schemas/` (the contract this feature expects), `api/` (a direct,
contract-validated call to the owning service), `store/` (an RTK slice with a
loading/error lifecycle — not just data), and empty `components/`/`hooks/`
folders to build into. No UI is scaffolded — that comes from the task's
wireframe, per B7.
