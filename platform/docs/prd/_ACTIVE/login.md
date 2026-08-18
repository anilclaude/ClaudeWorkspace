# Login

## 1. What we're building

Email-and-password sign-in for the application. An existing user enters their
work email and password, and lands on their dashboard with an active session.

Accounts are created by an administrator — there is no self-service signup. This
module owns the sign-in screen, the credential check, and session establishment.
It does not own account creation or password reset beyond linking out to them.

This is the first thing every user touches, so the failure paths matter as much
as the happy path.

## 2. Screens / user stories

Wireframes: [`docs/wireframes/login/`](../../wireframes/login/index.md)

- **Login** (`login-default.png`) — as a user, I can enter my email and password
  and sign in, so that I reach my dashboard.
- **Validation and credential errors** (`login-error.png`) — as a user who typed
  something wrong, I see clearly what went wrong without losing what I typed.
- **Submitting** (`login-loading.png`) — as a user who has submitted, I can see
  the request is in progress and cannot accidentally submit twice.

## 3. Acceptance criteria

- **AC1** — Given a registered email and its correct password, when I submit,
  then I am redirected to `/dashboard` with an active session.

- **AC2** — Given a registered email and an incorrect password, when I submit,
  then an error reads "Email or password is incorrect", I stay on `/login`, and
  the email field still contains what I typed. The same message is shown for an
  unregistered email, so the response does not reveal whether an account exists.

- **AC3** — Given a submitted form, while the request is in flight, then the
  submit button is disabled and shows a loading state, both inputs are
  read-only, and a second submit does not fire a second request.

- **AC4** — Given an empty email field, when I submit, then "Email is required"
  appears beneath the email field and no network request is sent.

- **AC5** — Given an email that is not a valid address, when I submit, then
  "Enter a valid email address" appears beneath the email field and no network
  request is sent.

- **AC6** — Given an already-authenticated session, when I navigate to `/login`,
  then I am redirected to `/dashboard` without the form rendering.

- **AC7** — Given the password field, then its value is masked by default; a
  visibility toggle reveals and re-masks it; the toggle is reachable by keyboard
  and announces its state to a screen reader.

- **AC8** — Given the server returns a 5xx, when I submit, then a banner reads
  "Something went wrong. Try again.", both field values are preserved, and the
  form returns to its default (non-loading) state.

- **AC9** — Given the login page has loaded, then focus is in the email field,
  and Tab order is email → password → visibility toggle → forgot password →
  submit.

- **AC10** — Given an active session, when I reload the page or open a new tab,
  then I remain signed in until the session expires or I sign out.

- **AC11** — Given the login screen, when I activate "Forgot password?", then I
  navigate to `/forgot-password`. (That flow itself is out of scope — see §5.)

## 4. Data entities

**User**

| Field | Notes |
|---|---|
| `id` | primary key |
| `email` | unique, case-insensitive for lookup |
| `passwordHash` | bcrypt or argon2 — never the plain password |
| `createdAt` / `updatedAt` | timestamps |

## 5. Out of scope

- **Rate limiting / brute-force protection** — no attempt throttling, no
  lockout, no attempt logging in this release. Deliberately deferred, not
  overlooked; see the note below.
- Self-service registration — accounts are created by an administrator
- The forgot-password flow itself (AC11 only requires the link to navigate)
- Social login, SSO, SAML
- Two-factor authentication
- "Remember me" / extended sessions
- Password strength rules and rotation policy
- **Sign-out / logout capability.** AC10's "until the session expires or I
  sign out" is satisfied in this pass by expiry-based persistence only — no
  logout endpoint, token-clearing action, or UI control ships here. A sign-out
  control needs application chrome (nav/header) to live in, and the dashboard
  itself (where that chrome would live) is already out of scope for this PRD.
  Logout is the dashboard PRD's responsibility, not login's.

> **Note on the rate-limiting deferral.** Without throttling, the sign-in
> endpoint accepts unlimited password guesses. AC2's uniform error message
> prevents account enumeration but does nothing against brute force. If this
> ships to a public network, throttling should be the next PRD rather than a
> later one.
