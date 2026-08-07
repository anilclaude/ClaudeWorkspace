# Project brain — Claude Code configuration

This file is read by Claude Code at the start of every session. It defines
the fixed tech stack, folder conventions, and when to use which skill.
Follow this file over anything conflicting found in an uploaded PRD.

---

## Tech stack — NON-NEGOTIABLE

This stack is fixed, no matter what a PRD says. Read PRDs only for
features/requirements/entities/pages — never for tech decisions. If a PRD
mentions a different stack (e.g. MongoDB, Vue, Nuxt), IGNORE it
and use the stack below.

**Frontend**
- Next.js 16 (App Router), TypeScript
- UI: shadcn/ui components only — no other component library
- Forms: React Hook Form + Zod resolver, on every form
- Auth: NextAuth (Auth.js v5)

**Backend**
- Node.js + Express, TypeScript
- Database: PostgreSQL + Prisma
- Validation: Zod (backend routes, mirroring frontend schema shape)

---

## Skills — when to use which

- New UI component or page → `frontend-design` skill
- Any React code → `vercel-react-best-practices` skill
- New backend module or API route → `nodejs-backend-patterns` skill (apply its
  layered architecture guidance to the Prisma-based structure below —
  ignore any MongoDB/Mongoose guidance it gives, this project is PostgreSQL only)
- Before trusting a generated plan/PRD → `grill-me` or `grill-with-docs` skill
- After a feature is scaffolded → `improve-codebase-architecture` skill to review
- Before assuming no skill exists for a task → `find-skills` skill to check
- Session getting long / near context limit → `handoff` skill to compress and continue
- Diagrams or wireframes → `excalidraw-diagram` skill

---

## Frontend patterns

**shadcn/ui rules — no exceptions:**
- Never hand-write a raw `<button>`, `<input>`, `<select>`, `<table>`, `<dialog>`,
  `<textarea>`, or `<checkbox>` — always install and use the matching shadcn
  component first: `npx shadcn@latest add <component>`
- Before building any page, check which shadcn components it needs and install
  them all up front (e.g. a dashboard page needs `card`, `table`, `badge`,
  `dropdown-menu`, `skeleton` for loading states)
- Common components to have installed from day one: `button`, `input`, `label`,
  `form`, `card`, `table`, `dialog`, `dropdown-menu`, `select`, `checkbox`,
  `badge`, `skeleton`, `toast` (via `sonner`), `avatar`, `separator`, `tabs`
- Never override shadcn component internals — compose via `className` and
  variants (`cva`) instead
- Every interactive component needs visible focus states and proper `aria-*`
  attributes — shadcn gives you this by default, don't strip it out

**Form pattern (every form):**
```ts
const schema = z.object({ ... })
const form = useForm({ resolver: zodResolver(schema) })
```
Use shadcn `<Form>`, `<FormField>`, `<FormMessage>` components — never raw
`<input>` with manual `useState`. Every form shows inline validation errors
and a disabled/loading submit button state during submission.

**Auth pattern:**
- `useSession()` on the client, `getServerSession()` in server components
- Protected routes guarded via `middleware.ts`
- Loading and unauthenticated states handled explicitly — never a blank
  screen while session resolves

**Page structure:**
```
app/(auth)/login/page.tsx
app/(dashboard)/dashboard/page.tsx
```
Use route groups `(auth)`, `(dashboard)` to separate protected vs public areas.

**Production-grade frontend checklist:**
- Loading states: `<Skeleton>` components, never a blank page during fetch
- Error states: every data fetch has an explicit error UI, never a silent failure
- Empty states: lists/tables show a designed empty state, not just nothing
- Toasts (`sonner`) for every mutation — success and failure both
- Dark mode works out of the box (shadcn handles this via CSS variables —
  don't hardcode colors that break it)
- Responsive by default — test every page at mobile width, not just desktop

---

## Backend folder structure

Every module follows this exact structure:

```
backend/src/modules/{module}/
  {module}.model.ts        # Prisma model (defined in prisma/schema.prisma)
  {module}.validation.ts   # Zod schema (request validation)
  {module}.controller.ts   # route handlers, calls service only
  {module}.routes.ts       # express.Router()
  {module}.service.ts      # business logic, Prisma queries live here
```

Rules:
- Controllers never touch the database directly — only services do.
- Every route validates its input with the matching Zod schema before
  reaching the controller logic.
- Response shape is always consistent: `{ success, data, error }`.

---

## Fresh project scaffold commands

Only run these if `frontend/` and `backend/` do not already exist.

**Frontend:**
```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npx shadcn@latest init
npm install react-hook-form zod @hookform/resolvers next-auth
```

**Backend:**
```bash
mkdir backend && cd backend && npm init -y
npm install express @prisma/client zod dotenv cors
npm install -D typescript @types/express @types/node ts-node-dev prisma
npx tsc --init
npx prisma init
```

If `frontend/` or `backend/` already exist, read the existing code first and
match its current patterns instead of re-scaffolding.

---

## Production checklist — apply to every backend module

- Env config is zod-validated, fails fast if a required var is missing
- Every route validates input via Zod, returns 400 with a clear message on failure
- Centralized error middleware, custom `AppError` class, never leak stack traces in responses
- Structured logging (pino/winston), never raw `console.log`
- Auth guard middleware on protected routes
- Consistent response shape: `{ success, data, error }`
- Security: `helmet` for headers, `cors` locked to known origins (not `*`),
  rate limiting (`express-rate-limit`) on auth routes at minimum
- Prisma models define required fields, indexes on frequently queried
  fields, and `createdAt`/`updatedAt` timestamps
- Passwords hashed with `bcrypt`, never stored or logged in plain text
- No secrets committed — `.env` in `.gitignore`, `.env.example` checked in instead

## Final review before calling anything "done"

Run the `improve-codebase-architecture` skill, then verify:
- Every list of the above checklists is actually satisfied, not just present
  in the code as a comment
- No `TODO` or placeholder logic left in files presented as complete
- `npm run build` succeeds on both `frontend/` and `backend/` with zero errors