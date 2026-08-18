# PRDs

`_ACTIVE/` — being built now. `_SHIPPED/` — every task done, moved here by `/wrap`.

## Minimum viable PRD — five sections

`/plan` refuses anything less. This is deliberately lighter than a full
refinement gate: no Risks, Assumptions, Dependencies, or Technical Exceptions
sections are required at this scale.

```markdown
# <Feature name>

## 1. What we're building
Two or three paragraphs. What it does, who uses it, why it exists.

## 2. Screens / user stories
One entry per screen, each naming its wireframe folder.

- **Login** (`docs/wireframes/login/`) — as a user, I can sign in with
  email and password so that I reach my dashboard.

## 3. Acceptance criteria
NUMBERED. TESTABLE. Step-wise. This section is what everything else hangs off.

- **AC1** — Given a valid email and password, when I submit, then I am
  redirected to /dashboard.
- **AC2** — Given an invalid password, when I submit, then an inline error
  reads "Email or password is incorrect" and I stay on /login.
- **AC3** — Given a submitted form, while the request is in flight, the
  submit button is disabled and shows a loading state.

## 4. Data entities
Rough shape — fields and relationships. Exact types are the builder's call.

User: id, email (unique), passwordHash, createdAt

## 5. Out of scope
Explicit. This is what stops scope drift mid-build.

- Social login
- Two-factor authentication
```

## Writing ACs that work

An AC must be checkable by a test. The reviewer asks of every test: *"would this
fail if the system did the wrong thing?"* — which is only answerable if the AC
says what the right thing is.

| Bad | Good |
|---|---|
| The login should be secure | AC — after 5 failed attempts in 15 minutes, further attempts return 429 until the window expires |
| Errors are handled nicely | AC — when the API returns 500, an error banner reads "Something went wrong. Try again." and the form stays filled |
| Fast page load | AC — the dashboard renders a skeleton within 100ms and real data within 2s on a 3G profile |

Prose requirements are the most common reason these builds go wrong. If a
requirement can't be phrased as a checkable AC, it isn't ready to build.
