# Task ledger — login

Written by `/plan`, updated by `/build` and `/commit`. This is the durable record —
the session task list is not persisted, so a task that only exists there is lost
when the session ends.

`status`: `ready` → `in_progress` → `in_review` → (`rework` →) `done`

---

```yaml
- id: T01
  title: Login endpoint contract (request/response schemas)
  ac: [AC1, AC2]
  wireframe: none
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    AC1 (success) and AC2 (uniform credential-mismatch error) describe the
    same POST /auth/login contract - request schema and the two response
    shapes belong in one Zod file in shared/contracts/src/auth. Splitting
    them would mean reviewing half a schema file twice.

- id: T02
  title: User entity and migration in backend/auth
  ac: [AC1, AC2]
  wireframe: none
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    Data layer underlying both branches of the credential check (PRD §4:
    id, email unique/case-insensitive, passwordHash, timestamps). No
    independent AC covers the schema alone.

- id: T03
  title: POST /auth/login endpoint - credential check and uniform error
  ac: [AC1, AC2]
  wireframe: none
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    One handler serves both the success branch (AC1) and the uniform
    failure branch (AC2 requires the identical message for a wrong
    password and an unregistered email) - one code path with two return
    values, not two features. Review cycle 1 SHOULD-FIX addressed:
    loginRequestSchema now caps email at 255 chars and password at 72
    bytes (bcrypt's own limit) instead of accepting unbounded input.
    Second SHOULD-FIX (timing side-channel) is a logged PRD-ambiguity
    decision, not a code fix; NIT left as-is per reviewer's own
    assessment.

- id: T04
  title: Session-check mechanism (already-authenticated guard + persistence)
  ac: [AC6, AC10]
  wireframe: none
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    AC6 (redirect away from /login when already signed in) and AC10
    (session survives reload/new tab) are both answered by the same
    session-validation check invoked at different times - one mechanism,
    not two. Implemented as a pure client-side JWT decode + expiry check
    (checkSession in frontend/libs/core/src/session.ts), not a backend
    endpoint - no server round-trip adds a guarantee the self-verifying
    exp claim doesn't already give, since this PRD has no
    revocation/logout/refresh mechanism (§5). Signature is deliberately
    not verified client-side (would require shipping JWT_SECRET to the
    browser); AC6/AC10 gate a redirect/render decision, not access to a
    protected resource. Logged as a PROCEED decision in DECISIONS.md.
    T13/T14 (frontend UI behaviors) will call checkSession at mount and
    on reload/new-tab respectively.

- id: T05
  title: Login form skeleton and layout
  ac: [AC11]
  wireframe: docs/wireframes/login/login-default.png
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    Reviewer cycle 1 SHOULD-FIX addressed: added
    frontend/web/src/app/globals.css.test.ts, a regression test for the
    globals.css @source fix (scaffold/memory/DECISIONS.md's "T05 (scaffold
    bug)" entry) - runs the real postcss + @tailwindcss/postcss pipeline
    against the actual globals.css and asserts a class known to originate
    only from @app/ui's Button is present in the compiled output, so a
    future accidental removal of the @source line fails this test.
    Chosen over a full `next build`-based test for speed (~1s vs a full
    production build) while still exercising the exact mechanism under
    test. Also flagged the @source-per-consumer requirement in
    scaffold/inputs/tech-stack.md for future UI-shipping packages/apps.

- id: T06
  title: Client-side field validation (empty / malformed email)
  ac: [AC4, AC5]
  wireframe: docs/wireframes/login/login-error.png
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    AC4 and AC5 are both pure client-side checks that block submission
    before any network call, sharing one validation function and one
    inline-error rendering path.

- id: T07
  title: Submit flow - call login API, redirect to /dashboard on success
  ac: [AC1]
  wireframe: docs/wireframes/login/login-default.png
  status: done
  branch: master
  review_cycles: 2
  commit: b5920c9
  note: >
    Live verification during this task found a pre-existing bug in
    frontend/web/src/lib/services.ts (dynamic process.env[name] read never
    inlined by Next.js in the browser) — fixed with a regression test, see
    DECISIONS.md "T07 (regression)". Review cycle 1 BLOCKER: a
    storeSessionToken write failure after a successful login was silently
    swallowed identically to a credential error; fixed with its own nested
    try/catch and a falsifiable regression test. Cycle 2 cleared.

- id: T08
  title: Credential-error banner (wrong password / unregistered email)
  ac: [AC2]
  wireframe: docs/wireframes/login/login-error.png
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    Reviewer cycle 1: 0 BLOCKER, 1 SHOULD-FIX, 1 NIT. SHOULD-FIX was a
    login-error.png-vs-index.md contradiction (PNG shows red-bordered
    inputs + duplicate inline text; index.md says keep banner and inline
    error separate) rather than a code defect — logged and escalated in
    DECISIONS.md ("T08 (reviewer escalation)") for a planning decision
    before T10, which shares this wireframe, is built. Not reworked.

    A `success: false` response (wrong password or unregistered email) now
    renders a distinct banner (state: credentialError), separate from
    emailError (T06) and submitError (T07's storage-failure message), per
    docs/wireframes/login/index.md's "do not collapse them into one" note.
    Banner text is sourced from LOGIN_INVALID_CREDENTIALS_MESSAGE in
    shared/contracts/src/auth, not a hardcoded duplicate. Email field is
    never cleared on this branch, so it retains what was typed; no
    redirect occurs.

- id: T09
  title: Submit lifecycle - in-flight loading state + server-error (5xx) banner
  ac: [AC3, AC8]
  wireframe: docs/wireframes/login/login-loading.png
  status: done
  branch: master
  review_cycles: 1
  commit: b5920c9
  note: >
    Fixed with a useRef-based guard, re-verified live the same way the bug
    was caught (two synchronous requestSubmit() calls -> now 1 real POST,
    not 2; normal login still redirects and stores the token correctly).

    Review cycle 1: 2 BLOCKER, 1 SHOULD-FIX. BLOCKER 1 — the double-submit
    guard was `useState`-based (`if (isLoading) return;`); live verification
    against a real backend found two synchronous `form.requestSubmit()`
    calls in one script tick produced two real POST requests, since
    `setIsLoading(true)` doesn't flush synchronously under React 18's
    automatic batching, so the second same-tick `handleSubmit` invocation
    reads the same stale `isLoading = false` its closure captured at render
    time. Fixed with a `useRef`-based guard (`isSubmittingRef`), read/written
    synchronously outside React's state machinery, set as the first
    statement in `handleSubmit` and reset on every exit path (validation
    failure, success, credential error, storage-write failure, thrown error,
    and the `finally`). `isLoading` state is kept only for the button's
    visual loading state, no longer relied on for the guard itself. BLOCKER
    2 — the original "rapid double-submit" test used two sequential
    `fireEvent.submit()` calls, which cannot reproduce the same-tick race
    (each `fireEvent` call is wrapped in its own `act()`, which flushes
    pending state between the two dispatches). Rewrote it as a same-tick
    test: two raw `form.dispatchEvent(new Event('submit'))` calls wrapped
    together in a single `act()`, so no flush happens between the two
    `handleSubmit` invocations. Manually verified this new test fails red
    against a temporarily-reverted `useState`-only guard (2 calls instead of
    1) and passes green with the ref-based fix restored — the same way the
    orchestrator's live browser test caught the original bug. The old
    sequential-submit test is kept as a separate, explicitly weaker
    regression test. SHOULD-FIX — `login-loading.png` shows both fields with
    a muted/gray fill during loading, which `@app/ui`'s `Field` only applies
    when `disabled` is true (not `readOnly`); added `disabled={isLoading}`
    alongside the existing `readOnly={isLoading}` on both fields, plus a
    `disabled` assertion in the existing loading-state test. Status left at
    `in_review` — the orchestrating session will re-verify the double-submit
    guard live against a real backend before setting `status: done`, the
    same way the original bug was caught.

    Regrouped 2026-08-10 from originally separate T09 (AC3) and T10 (AC8) -
    both touch the same region of handleSubmit's request lifecycle (loading
    state during the fetch; the 5xx banner if it errors). Not "genuinely
    inseparable" per P4's stated bar - a deliberate bend of that bar for
    speed on small, low-risk work, done at the user's explicit request, not
    a P4-mandated combination. Second wireframe: login-error.png (AC8's
    banner state) - read both PNGs, this task spans two screens' worth of
    state.

    Pre-build gaps flagged 2026-08-10, bake into the builder dispatch:
    (1) AC8 says "the server returns a 5xx" - the outer catch must check
    `err instanceof ApiClientError && err.status >= 500` before showing the
    banner, not treat any thrown error (network failure, CORS, a schema
    mismatch) as a 5xx. (2) AC3's "a second submit does not fire a second
    request" needs a code-level guard (`if (isLoading) return;` at the top
    of handleSubmit), not just a disabled button - a fast double-Enter can
    race React's re-render. (3) The double-submit guard needs a test that
    asserts the API mock was called exactly once under a simulated rapid
    double-submit, not just that the button shows `disabled`.

- id: T10
  title: Accessibility polish - password visibility toggle + initial focus/tab order
  ac: [AC7, AC9]
  wireframe: docs/wireframes/login/login-default.png
  status: done
  branch: master
  review_cycles: 3
  commit: b5920c9
  note: >
    Regrouped 2026-08-10 from originally separate T11 (AC7) and T12 (AC9) -
    both small, isolated polish on the same screen (login-default.png),
    don't interact with each other's logic. Same P4-bend caveat as T09
    above.

    Pre-build gaps flagged 2026-08-10, bake into the builder dispatch:
    (1) No icon-button primitive exists in @app/ui - the current toggle is
    a decorative `<span aria-hidden>`, not a real interactive element.
    Converting it means either a bare `<button>` (a real R6 raw-markup risk)
    or repurposing Button awkwardly for an icon-only inline toggle. This is
    a genuine design-system gap - log whichever choice is made as a PROCEED
    decision in DECISIONS.md, don't silently pick one. (2) AC9 requires
    `autoFocus` on the email field on page load - not present anywhere in
    page.tsx today; easy to miss since nothing currently tests for it.
    (3) AC7's "announces its state to a screen reader" needs `aria-pressed`
    (boolean) plus a dynamic `aria-label` ("Show password"/"Hide
    password") - a commonly half-implemented pattern where the toggle works
    visually but the screen-reader state is forgotten.

    Review cycle 1: cleared with 0 BLOCKER, 2 SHOULD-FIX, 1 NIT. Fixed: (1)
    AC9's Tab-order test only checked static DOM order plus tabIndex on the
    toggle - replaced with an explicit tabIndex check on all five
    Tab-sequence elements plus a real `@testing-library/user-event` `tab()`
    traversal test (new devDependency, logged in DECISIONS.md - nothing in
    fireEvent/jsdom can simulate real Tab-key focus movement). (2) No test
    proved the toggle doesn't submit the form - added an AC7 test asserting
    postMock/pushMock are not called after clicking the toggle, verifying
    IconButton's `type="button"` default actually holds. (3) NIT (optional,
    addressed anyway): added a comment at the toggle's call site in page.tsx
    flagging that its `bottom-1 right-1` positioning is anchored to the
    whole Field wrapper, not the input itself, and will misalign if this
    pattern is reused on a field that can show a validation error.

    Review cycle 2: 1 BLOCKER on the cycle-1 "toggle does not submit the
    form" test itself (page.test.tsx) - it rendered the page and clicked
    the toggle with both fields still empty, so AC4/AC5's own email
    validation guard in handleSubmit would return before ever reaching
    postMock regardless of whether the click actually triggered a form
    submit; the assertion passed for the wrong reason. Fixed by filling in
    a valid email and password before clicking the toggle, so a
    `type="submit"` regression on IconButton would actually reach
    postMock. Falsifiability manually verified both directions: temporarily
    dropped IconButton's `type = 'button'` default, reran this test alone,
    confirmed it failed red (postMock called once); restored the default,
    reran, confirmed green. The other two cycle-1 findings (tab-order
    traversal test, positioning comment) were independently reviewed and
    confirmed already resolved - no further changes needed there.

    Review cycle 3: clear (0 BLOCKER, 0 SHOULD-FIX, 0 NIT). Reviewer traced
    validateEmail/handleSubmit independently to confirm the cycle-2 fix
    actually closes the gap, and confirmed no other file regressed since
    cycle 2. T10 done.

- id: T11
  title: Session persistence - already-authenticated redirect guard + reload/new-tab persistence
  ac: [AC6, AC10]
  wireframe: docs/wireframes/login/login-default.png
  status: done
  branch: master
  review_cycles: 2
  commit: b5920c9
  note: >
    Regrouped 2026-08-10 from originally separate T13 (AC6) and T14 (AC10) -
    both consume T04's checkSession mechanism; "redirect if already signed
    in" and "stay signed in across reload/new tab" are the same check
    applied at two different mount points, already flagged as closely
    related in T04's own DECISIONS.md entry. Same P4-bend caveat as T09
    above.

    Pre-build gaps flagged 2026-08-10, bake into the builder dispatch:
    (1) AC6 says "redirected... without the form rendering" - a naive
    useEffect-based check renders the form first, then redirects (a brief
    flash that arguably fails AC6's literal wording). The check must gate
    rendering itself (render nothing/a loading state until checkSession
    resolves), not redirect-after-render. (2) AC10's testable proof is
    genuinely unclear given /dashboard is a bare placeholder with zero
    session-awareness - does this task need to add a protected-route guard
    to /dashboard (arguably scope creep into a future PRD, since
    dashboard's real content is out of scope for this PRD), or is proving
    the token survives in localStorage across a simulated reload
    sufficient on its own? Resolved direction: AC10 is satisfied by proving
    `checkSession(readSessionToken())` still returns valid after a
    simulated reload (token persistence + expiry logic) - do NOT build
    dashboard protected-route logic, that belongs to dashboard's own future
    PRD. If genuinely still unsure once building, log a HOLD rather than
    guess either direction silently.

    Review cycle 1: 0 BLOCKER, 2 SHOULD-FIX, 3 NIT. Fixed: (1) the mount
    effect's checkSession(readSessionToken()) had no failure handling,
    unlike T07's write-path precedent - wrapped in try/catch, fails open
    to the sign-in form (not stuck on the spinner) on a storage read
    error, with a regression test spying on Storage.prototype.getItem
    directly. (2) The AC10 remount test used the same token for both
    mounts, so it couldn't catch a module-level caching regression - added
    a second test that swaps in an expired token between mounts and
    asserts no second redirect. All 3 NITs addressed too (redundant
    aria-live dropped, stale T13/T14 references updated in session.ts and
    session-storage.ts, reactStrictMode dev-double-invoke comment added).
    An unrelated wireframe gap the reviewer found (an unbuilt "signed out
    by expiry" banner state) was routed to DECISIONS.md as its own OPEN
    row, not part of this task.

    Review cycle 2: clear (0 BLOCKER, 0 SHOULD-FIX, 0 NIT). Reviewer traced
    both fixes by hand to confirm they're falsifiable, not just present.
    T11 done.
```
