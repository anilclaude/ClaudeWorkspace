# backend-module template

Copy `__module_name__/` into an existing service's `src/modules/`, then
replace two placeholders — both are used, and they don't overlap so a
find-and-replace on one is safe against the other:

- `__module_name__` — lowercase, e.g. `orders` (file names, folder name, route
  path, table name)
- `__ModuleName__` — PascalCase, e.g. `Orders` (class names)

## Unlike `backend-service/`, this one is illustrative, not copied

No real DB-backed module exists in this codebase yet to copy from — only
`health`, which has no entity, no DTO, no validation. This template is written
fresh, from the conventions `repo-structure.md` documents in prose:
controllers never touch the database, only `*.service.ts` does; validation is
Zod, matching every other layer of the stack (env schemas, `@app/contracts`);
`dto/` holds the type inferred from the Zod schema rather than a duplicate
class-validator definition.

**Once a real feature module exists, replace this template's guts with a copy
of that instead** — a template grown from an imagined shape is worth less than
one grown from something that's actually shipped and been reviewed.

## Checklist after copying

- [ ] Both placeholders replaced, consistently
- [ ] Registered in the owning service's `app.module.ts` — add the module to
      its `imports` array
- [ ] If this module is consumed by another service or the frontend: the
      shape it exposes goes in `shared/contracts/src/<service>/` **first**
      (X6), then this module implements against it — not the other way round
- [ ] A real migration generated once the entity is final:
      `pnpm --filter @app/<service>-service migration:generate src/db/migrations/Add<ModuleName>`

## What you get

Entity → Zod validation schema → DTO type → service (the only file touching
the repository) → controller (validate, delegate, return — nothing else) →
one real unit test with a mocked repository, following R1's rule: it would
fail if `create()` stopped actually calling `save()`.
