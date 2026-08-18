import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { auth } from '@app/contracts';
import { ApiClientError } from '@app/frontend-core';
import LoginPage from './page';
import { readSessionToken, storeSessionToken } from '@/lib/session-storage';
import { makeStore, setCurrentStore, getStore } from '@/store';
import { setSessionToken } from '@/store/session.slice';

// T07 — submit flow (AC1). `next/navigation`'s `useRouter` and the
// service-layer `authService()` are mocked rather than exercised for real:
// this suite is about what LoginPage does with the response, not about
// Next's router internals or the contract-validated HTTP client itself
// (both already have their own coverage elsewhere).
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const postMock = vi.fn();
vi.mock('@/lib/services', () => ({
  authService: () => ({ post: postMock }),
}));

// Review cycle 1 BLOCKER fix: storeSessionToken is wrapped (not fully
// replaced) so its real in-memory-store-backed behavior (cr-in-memory-session
// — previously localStorage-backed) still runs for every existing test, but
// one test below can force a single call to throw (simulating a real write
// failure) via mockImplementationOnce. readSessionToken is wrapped the same
// way (cr-in-memory-session addition) so the "storage read failure" test
// below can force a single read to throw too, without either wrapper
// changing behavior for every other test, which still exercises the real
// implementation.
vi.mock('@/lib/session-storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/session-storage')>(
    '@/lib/session-storage',
  );
  return {
    ...actual,
    storeSessionToken: vi.fn(actual.storeSessionToken),
    readSessionToken: vi.fn(actual.readSessionToken),
  };
});

// T11 — every `render(<LoginPage />)` runs an AC6 session check on mount
// (see page.tsx), reading `@/lib/session-storage`'s current in-memory store.
// cr-in-memory-session — a file-wide `beforeEach` seeds a brand-new,
// empty store before every test (mirroring what a real fresh
// `StoreProvider` mount gets — see store/provider.tsx), the in-memory
// equivalent of the old `window.localStorage.clear()`: `LoginPage` itself
// never wraps in `<StoreProvider>` (it reads/writes via
// `@/lib/session-storage`'s plain functions, which read the module-level
// "current store" reference `setCurrentStore` sets — see store/index.ts),
// so tests seed that reference directly rather than rendering a Provider
// wrapper nothing in this component subscribes to. Individual describe
// blocks below that need a *pre-authenticated* store still override this
// per test, right before their own `render(<LoginPage />)` call.
beforeEach(() => {
  setCurrentStore(makeStore());
});

// Hand-rolled JWT-shaped token builder for the AC6/AC10 tests below. This
// file runs under jsdom (a real `window`), unlike @app/frontend-core's own
// `session.test.ts` (no DOM lib, hand-rolled base64 by necessity) — `btoa`
// is available here, so this can stay simple.
function base64UrlEncode(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(payload: { sub: string; email: string; exp: number }): string {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlEncode(payload);
  return `${header}.${body}.fake-signature`;
}

// T05 — login form skeleton and layout, matching
// docs/wireframes/login/login-default.png.
describe('LoginPage (skeleton)', () => {
  // AC11 — activating "Forgot password?" navigates to /forgot-password.
  it('AC11: renders a "Forgot password?" link that points at /forgot-password', () => {
    render(<LoginPage />);

    const link = screen.getByRole('link', { name: /forgot password\?/i });

    expect(link.getAttribute('href')).toBe('/forgot-password');
  });

  // Skeleton/layout coverage: the wireframe's other required elements are
  // present, even though this task leaves them inert (T06-T12 wire up
  // behavior). Not tied to a single AC — this is the layout smoke test B2
  // asks for on a task with no behavioral AC of its own beyond AC11.
  it('renders the email field, password field, and submit button described by the wireframe', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/^email$/i)).toBeDefined();
    expect(screen.getByLabelText(/^password$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeDefined();
  });
});

// T06 — client-side email validation, matching the inline error state drawn
// on docs/wireframes/login/login-error.png (Field's error prop renders the
// red-bordered input + text beneath it).
describe('LoginPage (client-side email validation)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // AC4/AC5 both require that no network request is sent when validation
    // fails. Spying on the real fetch lets each test assert that directly,
    // rather than relying on there being no fetch call anywhere in the
    // codebase yet (which would pass this assertion for the wrong reason).
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // AC4 — empty email field, on submit shows "Email is required" beneath
  // the email field, no network request is sent.
  it('AC4: submitting with an empty email shows "Email is required" beneath the field and sends no request', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    const emailField = screen.getByLabelText(/^email$/i);
    const error = screen.getByText('Email is required');

    expect(error).toBeDefined();
    expect(emailField.getAttribute('aria-describedby')).toBe(error.id);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // AC5 — malformed email, on submit shows "Enter a valid email address"
  // beneath the email field, no network request is sent.
  it('AC5: submitting a malformed email shows "Enter a valid email address" beneath the field and sends no request', () => {
    render(<LoginPage />);

    const emailField = screen.getByLabelText(/^email$/i);
    fireEvent.change(emailField, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    const error = screen.getByText('Enter a valid email address');

    expect(error).toBeDefined();
    expect(emailField.getAttribute('aria-describedby')).toBe(error.id);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Regression guard: a well-formed email clears any previously shown
  // error instead of leaving a stale "Email is required" / malformed
  // message on screen.
  it('clears the inline email error once a valid email is entered', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByText('Email is required')).toBeDefined();

    const emailField = screen.getByLabelText(/^email$/i);
    fireEvent.change(emailField, { target: { value: 'sam@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(screen.queryByText('Email is required')).toBeNull();
    expect(screen.queryByText('Enter a valid email address')).toBeNull();
  });
});

// T07 — AC1: valid credentials → session established, redirect to /dashboard.
describe('LoginPage (submit flow, AC1)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    postMock.mockReset();
  });

  function fillAndSubmit(email: string, password: string) {
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
  }

  // AC1 — "Given a registered email and its correct password, when I
  // submit, then I am redirected to /dashboard with an active session."
  it('AC1: on a successful login, stores the session token and redirects to /dashboard', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: { token: 'a.b.c', user: { id: 'user-1', email: 'ada@example.com' } },
      error: null,
    });

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'correct-password');

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));

    expect(postMock).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'ada@example.com', password: 'correct-password' },
      expect.anything(),
    );
    expect(readSessionToken()).toBe('a.b.c');
  });

  // Negative control for the same AC: a failure response (AC2's branch,
  // built by T08) must not establish a session or redirect — that would be
  // this task overreaching into T08's territory.
  it('does not store a session or redirect when the API returns a failure response', async () => {
    postMock.mockResolvedValue({
      success: false,
      data: null,
      error: { message: 'Email or password is incorrect', code: 'INVALID_CREDENTIALS' },
    });

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'wrong-password');

    await waitFor(() => expect(postMock).toHaveBeenCalled());

    expect(pushMock).not.toHaveBeenCalled();
    expect(readSessionToken()).toBeNull();
  });
});

// T08 — AC2: wrong password or an unregistered email both render the same
// credential-error banner, matching docs/wireframes/login/login-error.png.
// The server never distinguishes the two causes (uniform message), so a
// single `success: false` response covers both.
describe('LoginPage (submit flow, AC2 — credential-error banner)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    postMock.mockReset();
  });

  function fillAndSubmit(email: string, password: string) {
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
  }

  // AC2 — "an error reads 'Email or password is incorrect', I stay on
  // /login, and the email field still contains what I typed." Asserts the
  // banner text against the shared contract constant, not a hardcoded
  // duplicate string, so the test would fail if the two ever drifted apart.
  it('AC2: shows the banner with the exact contract message, keeps the typed email, and does not redirect', async () => {
    postMock.mockResolvedValue({
      success: false,
      data: null,
      error: { message: auth.LOGIN_INVALID_CREDENTIALS_MESSAGE, code: 'INVALID_CREDENTIALS' },
    });

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'wrong-password');

    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toContain(auth.LOGIN_INVALID_CREDENTIALS_MESSAGE);

    const emailField = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    expect(emailField.value).toBe('ada@example.com');

    expect(pushMock).not.toHaveBeenCalled();
    expect(readSessionToken()).toBeNull();
  });

  // Same banner for an unregistered email — AC2 requires the response not
  // reveal whether an account exists, so the client renders identically
  // regardless of which failure caused the `success: false` response.
  it('AC2: shows the same banner for an unregistered email as for a wrong password', async () => {
    postMock.mockResolvedValue({
      success: false,
      data: null,
      error: { message: auth.LOGIN_INVALID_CREDENTIALS_MESSAGE, code: 'INVALID_CREDENTIALS' },
    });

    render(<LoginPage />);
    fillAndSubmit('unregistered@example.com', 'some-password');

    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toContain(auth.LOGIN_INVALID_CREDENTIALS_MESSAGE);
    expect(pushMock).not.toHaveBeenCalled();
  });

  // Regression guard: a fresh submit attempt clears a previously shown
  // credential banner rather than leaving a stale one on screen once the
  // user retries.
  it('clears a previously shown credential banner on a subsequent submit', async () => {
    postMock.mockResolvedValueOnce({
      success: false,
      data: null,
      error: { message: auth.LOGIN_INVALID_CREDENTIALS_MESSAGE, code: 'INVALID_CREDENTIALS' },
    });

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'wrong-password');
    await screen.findByRole('alert');

    postMock.mockResolvedValueOnce({
      success: true,
      data: { token: 'a.b.c', user: { id: 'user-1', email: 'ada@example.com' } },
      error: null,
    });
    fillAndSubmit('ada@example.com', 'correct-password');

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    expect(screen.queryByText(auth.LOGIN_INVALID_CREDENTIALS_MESSAGE)).toBeNull();
  });
});

// Review cycle 1 BLOCKER: a storage-write failure after a *successful*
// server login must not be silently indistinguishable from a credential
// failure or a network/server error — those two are legitimate silent
// no-ops for this task (T08/T10's scope), but a discarded real session is
// not. This suite would fail (redirect happens, or the failure is
// invisible) if handleSubmit's storage write were folded back into the
// single swallow-everything try/catch it started in.
describe('LoginPage (submit flow, storage-write failure)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    postMock.mockReset();
    vi.mocked(storeSessionToken).mockReset();
  });

  function fillAndSubmit(email: string, password: string) {
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
  }

  it('surfaces a distinct, visible error and does not redirect when storeSessionToken throws on an otherwise-successful login', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: { token: 'a.b.c', user: { id: 'user-1', email: 'ada@example.com' } },
      error: null,
    });
    vi.mocked(storeSessionToken).mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'correct-password');

    const alert = await screen.findByRole('alert');

    // Distinct from both: (a) the happy path (no redirect happened despite
    // a successful API response), and (b) the credential-failure negative
    // control above (this message is not "Email or password is incorrect"
    // — conflating the two would mislead the user into re-entering
    // credentials that were already correct).
    expect(alert.textContent).toMatch(/could not save your session/i);
    expect(alert.textContent).not.toMatch(/email or password/i);
    expect(pushMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// T09 — AC3: in-flight loading state (submit button disabled + loading,
// both inputs read-only, a second submit does not fire a second request),
// matching docs/wireframes/login/login-loading.png.
describe('LoginPage (submit lifecycle, AC3 — in-flight loading state)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    postMock.mockReset();
  });

  function fillAndSubmit(email: string, password: string) {
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  }

  // Deferred promise so the request can be held "in flight" for as long as
  // each test needs before resolving it.
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  // AC3 — "the submit button is disabled and shows a loading state, both
  // inputs are read-only" while the request is in flight.
  it('AC3: while the request is in flight, the submit button is disabled and shows a loading state, and both inputs are read-only', async () => {
    const { promise, resolve } = deferred<unknown>();
    postMock.mockReturnValue(promise);

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'correct-password');

    const button = await screen.findByRole('button', { name: /signing in/i });
    expect(button.hasAttribute('disabled')).toBe(true);

    const emailField = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    const passwordField = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(emailField.readOnly).toBe(true);
    expect(passwordField.readOnly).toBe(true);
    // Review cycle 1 SHOULD-FIX: docs/wireframes/login/login-loading.png
    // draws both fields with a visibly muted/gray fill while loading, which
    // @app/ui's Field only applies when `disabled` is true (readOnly alone
    // renders a plain white field) — so `disabled` must be passed alongside
    // `readOnly`, not `readOnly` on its own.
    expect(emailField.disabled).toBe(true);
    expect(passwordField.disabled).toBe(true);

    // Let the pending request resolve so the test doesn't leak a dangling
    // promise/act warning into the next test.
    resolve({
      success: true,
      data: { token: 'a.b.c', user: { id: 'user-1', email: 'ada@example.com' } },
      error: null,
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  // AC3 — "a second submit does not fire a second request." Two sequential
  // `fireEvent.submit()` calls, which is a real double-submit scenario
  // (e.g. a slow double-click with a render in between) but is NOT the
  // same-tick race review cycle 1's live verification found: each
  // `fireEvent` call is internally wrapped in its own `act()`, and `act()`
  // flushes any pending state update before it returns — so by the time
  // the second `fireEvent.submit()` runs, React has already flushed the
  // first call's `setIsLoading(true)`, and even the old, reverted
  // `useState`-based guard would see the updated value here. This test on
  // its own would not have caught the BLOCKER; see the same-tick test
  // below for that.
  it('AC3: two sequential submits fire the API call exactly once', async () => {
    const { promise } = deferred<unknown>();
    postMock.mockReturnValue(promise);

    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'correct-password' },
    });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  // AC3 — the real same-tick race review cycle 1's live verification found:
  // two `form.requestSubmit()` calls issued synchronously in the same
  // script tick produced two real POST requests against the old
  // `useState`-based guard, because `setIsLoading(true)` does not flush
  // synchronously under React 18's automatic batching — the second
  // `handleSubmit` invocation reads the same stale `isLoading = false` its
  // closure captured at render time.
  //
  // To reproduce that here, both native `submit` events are dispatched
  // directly on the form element (bypassing `fireEvent`'s per-call `act()`
  // wrapping) and both dispatches are wrapped together in a *single*
  // `act()` call. That means React does not get a chance to flush any
  // state update between the two `handleSubmit` invocations — both run
  // synchronously to their first `await` before anything flushes,
  // matching the same-tick ordering the live browser test exposed. This is
  // the fix for review cycle 1 BLOCKER 2: the previous version of this
  // test used two sequential `fireEvent.submit()` calls (now kept above as
  // a separate, weaker regression test) which cannot reproduce this
  // ordering.
  //
  // Manually verified against the guard itself: temporarily reverting
  // handleSubmit's guard to `if (isLoading) return;` (the pre-fix,
  // useState-based check) makes this exact test fail with `postMock`
  // called twice; restoring the `isSubmittingRef`-based guard makes it
  // pass again. The sequential-submit test above stays green either way,
  // which is exactly why it could not have caught the original BLOCKER on
  // its own.
  it('AC3: two same-tick form submits (no React flush between them) fire the API call exactly once', async () => {
    const { promise } = deferred<unknown>();
    postMock.mockReturnValue(promise);

    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'correct-password' },
    });

    const form = container.querySelector('form') as HTMLFormElement;
    expect(form).not.toBeNull();

    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock).toHaveBeenCalledTimes(1);
  });
});

// T10 — AC7: password visibility toggle. Masked by default, a real
// keyboard-reachable `<button>` (via @app/ui's new `IconButton` primitive,
// not the decorative `aria-hidden` span T05 drew for wireframe fidelity)
// reveals/re-masks it, and announces its state to a screen reader via
// `aria-pressed` plus a dynamic accessible name ("Show password" / "Hide
// password").
describe('LoginPage (T10 — password visibility toggle, AC7)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    postMock.mockReset();
  });

  it('AC7: password is masked by default', () => {
    render(<LoginPage />);

    const passwordField = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordField.type).toBe('password');
  });

  it('AC7: the toggle is a real, keyboard-reachable button (not a decorative aria-hidden span)', () => {
    render(<LoginPage />);

    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle.tagName).toBe('BUTTON');
    // A positive tabIndex would be unusual too, but the concrete regression
    // this guards against is `tabIndex={-1}` (or the element not existing in
    // the accessibility tree at all, which `getByRole` above already rules
    // out) — either would remove it from the keyboard Tab sequence.
    expect(toggle.tabIndex).toBe(0);
  });

  it('AC7: clicking the toggle reveals the password, then re-masks it on a second click, updating aria-pressed and the accessible name each time', () => {
    render(<LoginPage />);

    const passwordField = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    const showToggle = screen.getByRole('button', { name: /show password/i });
    expect(showToggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(showToggle);

    expect(passwordField.type).toBe('text');
    const hideToggle = screen.getByRole('button', { name: /hide password/i });
    expect(hideToggle.getAttribute('aria-pressed')).toBe('true');
    // The same element, not a second one that replaced it — its accessible
    // name and pressed state changed in place.
    expect(hideToggle).toBe(showToggle);

    fireEvent.click(hideToggle);

    expect(passwordField.type).toBe('password');
    const toggleAfterRemask = screen.getByRole('button', { name: /show password/i });
    expect(toggleAfterRemask.getAttribute('aria-pressed')).toBe('false');
  });

  // Review cycle 1 SHOULD-FIX: `IconButton` defaults `type="button"`
  // specifically so an icon control inside `<form onSubmit>` can't
  // accidentally trigger a submit — this is the previously-untested safety
  // net. `IconButton` is now a shared `@app/ui` primitive future callers
  // will reuse, so the guarantee is asserted here rather than just trusted
  // to hold. A regression to a `<button>` with no explicit `type` (which
  // defaults to `"submit"` inside a `<form>`) would fire a real login
  // request and make this test fail.
  //
  // Review cycle 2 BLOCKER: the first version of this test clicked the
  // toggle with both fields still empty, so `handleSubmit`'s own AC4/AC5
  // email-validation guard would have returned before ever reaching
  // `postMock` regardless of whether the click actually triggered a form
  // submit — the assertion passed for the wrong reason and would not have
  // caught the regression it claims to guard against. Both fields are now
  // filled with valid values first, so a `type="submit"` regression
  // reaches `postMock` and the assertion becomes meaningful. Manually
  // verified: temporarily removing `type = 'button'` from `IconButton`'s
  // destructured default (frontend/libs/ui/src/components/icon-button.tsx)
  // makes this test fail red with `postMock` called; restoring it makes
  // the test pass again.
  it('AC7: clicking the toggle does not submit the form (no login request fired)', () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'correct-password' },
    });

    const toggle = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));

    expect(postMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

// T10 — AC9: initial focus and Tab order, matching
// docs/wireframes/login/login-default.png's acceptance-criteria panel
// ("Email field holds focus on page load. Tab order: email -> password ->
// toggle -> forgot -> submit").
describe('LoginPage (T10 — initial focus/tab order, AC9)', () => {
  it('AC9: focus is in the email field on page load', () => {
    render(<LoginPage />);

    const emailField = screen.getByLabelText(/^email$/i);
    expect(document.activeElement).toBe(emailField);
  });

  // Review cycle 1 SHOULD-FIX: the previous version of this suite only
  // checked DOM order plus `tabIndex` on the toggle button — a regression
  // that removed any of the *other* four elements from the Tab sequence
  // (e.g. a stray `tabIndex={-1}` on the email input or the submit button)
  // would have left it green. Every one of the five AC9-listed elements is
  // checked explicitly here.
  it('AC9: none of the five Tab-sequence elements has been removed from keyboard focus (no tabIndex={-1})', () => {
    render(<LoginPage />);

    const elements = [
      screen.getByLabelText(/^email$/i),
      screen.getByLabelText(/^password$/i),
      screen.getByRole('button', { name: /show password/i }),
      screen.getByRole('link', { name: /forgot password\?/i }),
      screen.getByRole('button', { name: /^sign in$/i }),
    ];

    for (const element of elements) {
      expect(element.tabIndex).toBe(0);
    }
  });

  // Review cycle 1 SHOULD-FIX: replaces the previous DOM-order-only
  // assertion with a real keyboard traversal via `@testing-library/user-event`'s
  // `tab()`, which computes the next focus target the same way a browser
  // does (respecting `tabIndex`, not just source order) — this actually
  // exercises the Tab sequence AC9 requires, rather than inferring it from
  // static markup order.
  it('AC9: pressing Tab repeatedly traverses email -> password -> visibility toggle -> forgot password -> submit, in that order', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailField = screen.getByLabelText(/^email$/i);
    const passwordField = screen.getByLabelText(/^password$/i);
    const toggle = screen.getByRole('button', { name: /show password/i });
    const forgotLink = screen.getByRole('link', { name: /forgot password\?/i });
    const submitButton = screen.getByRole('button', { name: /^sign in$/i });

    // Starting point — AC9's initial-focus half, re-asserted here since this
    // test's traversal depends on it.
    expect(document.activeElement).toBe(emailField);

    await user.tab();
    expect(document.activeElement).toBe(passwordField);

    await user.tab();
    expect(document.activeElement).toBe(toggle);

    await user.tab();
    expect(document.activeElement).toBe(forgotLink);

    await user.tab();
    expect(document.activeElement).toBe(submitButton);
  });
});

// T09 — AC8: server-error banner on a 5xx response, matching
// docs/wireframes/login/login-error.png's banner (distinct text from AC2's
// credential banner).
describe('LoginPage (submit flow, AC8 — server-error banner)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    postMock.mockReset();
  });

  function fillAndSubmit(email: string, password: string) {
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: email } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  }

  // AC8 — "Given the server returns a 5xx, when I submit, then a banner
  // reads 'Something went wrong. Try again.', both field values are
  // preserved, and the form returns to its default (non-loading) state."
  it('AC8: a 5xx ApiClientError shows the exact banner text, preserves both fields, and returns to the default non-loading state', async () => {
    postMock.mockRejectedValue(new ApiClientError('Request failed', 503));

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'whatever-password');

    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toContain('Something went wrong. Try again.');

    const emailField = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    const passwordField = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(emailField.value).toBe('ada@example.com');
    expect(passwordField.value).toBe('whatever-password');

    const button = await screen.findByRole('button', { name: /^sign in$/i });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(emailField.readOnly).toBe(false);
    expect(passwordField.readOnly).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });

  // Pre-identified gap: the banner must only appear for a genuine 5xx, not
  // for any thrown error. An ApiClientError with a non-5xx status (e.g. a
  // 400 the contract schema couldn't parse) must not show it.
  it('does not show the server-error banner for an ApiClientError with a non-5xx status', async () => {
    postMock.mockRejectedValue(new ApiClientError('Request failed', 400));

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'whatever-password');

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    // Give any (incorrect) banner render a chance to happen before asserting
    // its absence.
    await waitFor(() => expect(screen.queryByText(/try again/i)).toBeNull());
  });

  // Pre-identified gap: a thrown error that isn't an ApiClientError at all
  // (a network failure / CORS error, modeled here as the TypeError a real
  // `fetch` throws) must not be treated as a 5xx either.
  it('does not show the server-error banner for a non-ApiClientError thrown error (e.g. a network failure)', async () => {
    postMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<LoginPage />);
    fillAndSubmit('ada@example.com', 'whatever-password');

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/try again/i)).toBeNull());
  });
});

// T11 — AC6: an already-authenticated session is redirected away from
// /login without the form rendering. `checkSession`/`readSessionToken` are
// both synchronous, and RTL's `render()` flushes the mount `useEffect`
// (see page.tsx) synchronously before returning (Testing Library wraps
// `render` in `act()`, which flushes passive effects too), so the redirect
// and the absence of the form are both observable immediately without an
// `await waitFor(...)`.
describe('LoginPage (T11 — already-authenticated redirect guard, AC6)', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  function validToken(expiresInSeconds: number) {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return makeToken({ sub: 'user-1', email: 'ada@example.com', exp });
  }

  // cr-in-memory-session — seeds the *current* in-memory store (the file-wide
  // `beforeEach` above already gave this test a fresh one) directly via
  // `setSessionToken`, in place of the old `window.localStorage.setItem`.
  // This models the CR's AC3: the store already holding a valid token when
  // `LoginPage` mounts is exactly what "still logged in, navigated back to
  // /login via an in-app link" looks like (same store instance, no reload).
  function seedCurrentStoreWithToken(token: string) {
    getStore()!.dispatch(setSessionToken(token));
  }

  it('AC6/AC3 (cr-in-memory-session): an already-authenticated session redirects to /dashboard without the form ever rendering', () => {
    seedCurrentStoreWithToken(validToken(3600));

    render(<LoginPage />);

    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /^sign in$/i })).toBeNull();
  });

  it('AC6: with no session present, no redirect happens and the form renders normally', () => {
    render(<LoginPage />);

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^email$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeDefined();
  });

  // Negative control sharing the expiry boundary: an expired token in the
  // store must not be mistaken for an active session — the form renders,
  // not a redirect.
  it('AC6: an expired session does not redirect — the form renders instead', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    seedCurrentStoreWithToken(makeToken({ sub: 'user-1', email: 'ada@example.com', exp: expiredExp }));

    render(<LoginPage />);

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^email$/i)).toBeDefined();
  });

  // Review cycle 1 SHOULD-FIX (login PRD, pre-CR): originally simulated
  // `readSessionToken()`'s then-direct `window.localStorage.getItem` call
  // throwing for real (storage blocked, restrictive private-browsing, some
  // iframe embeddings). cr-in-memory-session moved `readSessionToken` to
  // read the in-memory store instead, which cannot fail that way — the
  // underlying guarantee this test protects (a thrown error out of the
  // session check must fail open to the form, not leave the user stuck on
  // the spinner) still needs proving, now via `@/lib/session-storage`'s own
  // mocked `readSessionToken` (see the module-level `vi.mock` above) forced
  // to throw for one call, the same wrapper pattern already used for the
  // "storage-write failure" suite's `storeSessionToken`.
  it('AC6: a session-check failure fails open to the sign-in form instead of leaving the user stuck on the "Checking your session…" spinner', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(readSessionToken).mockImplementationOnce(() => {
      throw new Error('Unexpected error reading the in-memory session store');
    });

    render(<LoginPage />);

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^email$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// cr-in-memory-session — replaces the login PRD's T11 "AC10: reload/new-tab
// session persistence" suite, which this CR explicitly reverses (see
// scaffold/memory/DECISIONS.md, "cr-in-memory-session", and the CR itself,
// `docs/prd/_CHANGE_REQUESTS/cr-in-memory-session.md`). These tests prove
// the CR's own three ACs instead: AC1 (in-app navigation keeps the session),
// AC2/VC-CR-002 (a reload/new tab does not restore one), and VC-CR-001
// (localStorage/sessionStorage are never touched). AC3 (same-session
// already-authenticated redirect) is covered by the AC6 describe block
// above — it's the same mechanism, just re-scoped to same-session-only by
// this CR, not a new behavior this suite needs to re-prove.
describe('LoginPage (cr-in-memory-session — AC1/AC2/VC-CR-001/VC-CR-002)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    postMock.mockReset();
  });

  // AC1 — "navigating between screens via in-app links/routing (no full
  // reload) keeps the user signed in." Modeled the same way the AC6/AC3 test
  // above does (same store instance already holding a token when a screen
  // mounts), but from the read side rather than the redirect side: two
  // independent reads via `readSessionToken()` against the SAME store
  // instance — the same relationship two different in-app screens (e.g.
  // /dashboard then back to /login) have to the one store that survives
  // client-side routing (store/provider.tsx) — both see the value a prior
  // write stored, with nothing in between resetting it.
  it('AC1: the session set by a prior write is still visible from two independent reads against the same store instance (in-app navigation)', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ sub: 'user-1', email: 'ada@example.com', exp });
    getStore()!.dispatch(setSessionToken(token));

    expect(readSessionToken()).toBe(token);
    // A second, independent read — nothing reset the store in between,
    // exactly like navigating to a second in-app screen without a reload.
    expect(readSessionToken()).toBe(token);
  });

  // AC2/VC-CR-002 — "Simulating a fresh page load (a new render of the
  // app's root state, not just a route change) with no in-memory token
  // present renders the login form, not a redirect." A fresh store (what a
  // real reload/new tab gets — see store/provider.tsx, a new
  // `StoreProvider` mount means a new `makeStore()` call) never sees a
  // token that was only ever written to a *different*, now-discarded store
  // instance.
  it('AC2/VC-CR-002: a token established before a simulated reload/new tab (a fresh store instance) does NOT redirect — the login form renders instead', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    getStore()!.dispatch(setSessionToken(makeToken({ sub: 'user-1', email: 'ada@example.com', exp })));

    const first = render(<LoginPage />);
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    first.unmount();

    pushMock.mockReset();

    // Simulated reload/new tab: a brand-new StoreProvider instance means a
    // brand-new, empty store — nothing carries the previous store's token
    // into this one.
    setCurrentStore(makeStore());

    render(<LoginPage />);

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^email$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeDefined();
  });

  // VC-CR-001 — "After login, window.localStorage and window.sessionStorage
  // contain no session-token key at any point." Exercises a full,
  // real (unmocked storeSessionToken/readSessionToken) login-success flow
  // plus the AC6/AC3 already-authenticated redirect check, and asserts
  // neither Storage prototype method was ever called by either path.
  it('VC-CR-001: a full successful login, and the already-authenticated redirect check, never call Storage.prototype.setItem/getItem', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    // A real JWT-shaped token (not the 'a.b.c' placeholder used elsewhere in
    // this file), since this test also re-mounts LoginPage afterward to
    // exercise the real AC6/AC3 `checkSession` decode+expiry check against
    // it — 'a.b.c' isn't valid base64url JSON and would read as no session.
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ sub: 'user-1', email: 'ada@example.com', exp });
    postMock.mockResolvedValue({
      success: true,
      data: { token, user: { id: 'user-1', email: 'ada@example.com' } },
      error: null,
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));

    // Same store instance still holds the token — mounting LoginPage again
    // (the AC6/AC3 already-authenticated path) must not touch storage
    // either.
    pushMock.mockReset();
    render(<LoginPage />);
    expect(pushMock).toHaveBeenCalledWith('/dashboard');

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
    getItemSpy.mockRestore();
  });
});
