'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  IconButton,
} from '@app/ui';
import { auth } from '@app/contracts';
import { ApiClientError, checkSession } from '@app/frontend-core';
import { authService } from '@/lib/services';
import { readSessionToken, storeSessionToken } from '@/lib/session-storage';

// Login screen (login PRD): T05 built the skeleton/layout (AC11); T06 adds
// client-side email validation (AC4, AC5), matching the inline error state
// drawn on docs/wireframes/login/login-error.png. T07 wires the submit flow
// itself (AC1 only) — call the login API, store the session token, redirect
// to /dashboard. T08 adds the credential-error banner (AC2): a
// `success: false` response (wrong password or unregistered email) renders
// the same banner either way — the uniform message is what keeps the
// response from revealing whether an account exists. T09 adds the in-flight
// loading state (AC3) and the server-error banner (AC8), matching
// docs/wireframes/login/login-loading.png and login-error.png respectively.
// T10 adds the password visibility toggle (AC7) and initial focus/tab order
// (AC9): email autoFocus on mount, and Tab order email -> password ->
// visibility toggle -> forgot password -> submit (the natural DOM order
// below, now that the toggle is a real focusable element rather than a
// decorative `aria-hidden` span). T11 adds the already-authenticated
// redirect guard (AC6): on mount, an existing valid session (per
// `@app/frontend-core`'s `checkSession`, reading the token
// `@/lib/session-storage` currently holds) redirects straight to /dashboard
// without the form ever rendering — see the `sessionStatus` state and its
// early return below.
//
// cr-in-memory-session (amends login PRD's AC10) — `@/lib/session-storage`
// now holds the token in memory (a Redux slice, `store/session.slice.ts`)
// instead of localStorage: a hard reload or a new tab no longer restores a
// previous session (that store is recreated fresh per page load — see
// `store/provider.tsx`), only in-app client-side navigation back to /login
// does (AC6 still fires in that case, since it's the same store instance).
// See scaffold/memory/DECISIONS.md ("cr-in-memory-session") for the full
// history.
//
// Per docs/wireframes/login/index.md's notes for the builder, the banner
// (form-level failures — AC2, AC8) and the inline field error (field-level
// failures — AC4, AC5) are deliberately separate elements. AC2's own wording
// only describes a banner, not a field-level error, so credentialError gets
// its own state distinct from emailError (T06) and submitError (T07's
// storage-write-failure message) rather than reusing either. AC8's
// serverError gets a fourth, equally distinct, state — the wireframes' own
// note is that these are separate mechanisms, not variants of one banner
// state, so collapsing any of the four into another would misreport which
// failure actually happened.
//
// A storage-write failure after a *successful* server login is different in
// kind, not degree: it is not covered by any task in the ledger, and
// treating it identically to "credentials were wrong" would silently throw
// away a real, server-authenticated session with zero signal anywhere. So
// it gets its own catch, distinct from the API-call try/catch below (review
// cycle 1 BLOCKER on T07).
//
// AC4/AC5 share one validation function and one inline-error rendering path
// per the ledger's note on T06 — Field's own `error` prop, not a bespoke
// error UI.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// AC8 — this exact banner text is purely client-owned UI copy: it never
// crosses the service boundary (the api-client throws before it ever
// attempts to parse a non-2xx response body, so there is no server-supplied
// message to render for a 5xx). That is what keeps it a local constant
// rather than a shared/contracts addition (CLAUDE.md #6 only applies to
// cross-boundary types).
const SERVER_ERROR_MESSAGE = 'Something went wrong. Try again.';

function validateEmail(value: string): string | undefined {
  if (value.trim() === '') {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(value)) {
    return 'Enter a valid email address';
  }
  return undefined;
}

export default function LoginPage() {
  const router = useRouter();

  // T11 — AC6: an already-authenticated session redirects away from /login
  // without the form ever rendering. `checkSession`/`readSessionToken` are
  // both synchronous and client-only (see their own module headers), so the
  // check can't run in a lazy `useState` initializer — that also executes
  // during SSR, where `window`/`localStorage` don't exist, and would either
  // throw or make the server's markup and the client's first hydrated
  // render disagree (a hydration mismatch). Instead, both the
  // server-rendered markup and the client's first hydrated render always
  // start from `sessionStatus === 'checking'`, resolved to
  // 'authenticated'/'unauthenticated' only inside `useEffect`, once mount
  // guarantees `window` exists. The form JSX is only ever returned once
  // `sessionStatus === 'unauthenticated'` (see the early return below) — it
  // is never part of the 'checking' render, so there is no render pass in
  // which both the form and a later redirect coexist.
  const [sessionStatus, setSessionStatus] = useState<
    'checking' | 'authenticated' | 'unauthenticated'
  >('checking');

  useEffect(() => {
    // Review cycle 1 SHOULD-FIX (login PRD, pre-CR): originally guarded
    // against `readSessionToken()`'s then-direct `window.localStorage.getItem`
    // call throwing (storage blocked, restrictive private-browsing, some
    // iframe embeddings). cr-in-memory-session moved `readSessionToken` to
    // read the in-memory `session` Redux slice instead (see
    // `@/lib/session-storage`), which cannot throw the same way — the
    // try/catch is kept anyway as a generic defensive guard: if
    // `checkSession`/`readSessionToken` were ever to throw for any reason,
    // `sessionStatus` must still resolve out of `'checking'` rather than
    // leaving the user stuck on the loading spinner forever with no way to
    // reach the sign-in form. This fails open to the form
    // (`'unauthenticated'`), not open to a stuck spinner — a failed check
    // means "can't confirm a session exists", which is the same as "no
    // session", not "block the user out".
    try {
      const session = checkSession(readSessionToken());
      if (session.valid) {
        // AC6 — this redirect fires whether /login was just navigated to
        // directly or reached via in-app client-side navigation while still
        // signed in (the CR's AC3): neither `checkSession` nor
        // `readSessionToken` cache anything beyond the current in-memory
        // store, so every independent mount re-derives the same answer from
        // it. cr-in-memory-session (amends AC10): this no longer fires after
        // a hard reload/new tab — that recreates the store fresh with no
        // token in it (see store/provider.tsx), which is the CR's AC2. See
        // DECISIONS.md for why this task does not additionally add a
        // protected-route guard to /dashboard.
        setSessionStatus('authenticated');
        router.push('/dashboard');
        return;
      }
    } catch (err) {
      console.error('Failed to check for an existing session', err);
    }
    setSessionStatus('unauthenticated');
    // Deliberately an empty dependency array — this must run exactly once
    // per mount (on navigating to /login, whether via in-app client-side
    // routing or a fresh page load), not every time `router`'s reference
    // happens to change. `router` is safe to omit here: Next's real
    // `useRouter()` is stable in practice, and this check does not need to
    // re-observe a router-identity change to stay correct — re-running it
    // on every re-render this effect itself triggers (`setSessionStatus`)
    // would call `router.push('/dashboard')` more than once for the same
    // signed-in session, which is exactly the bug this array shape avoids.
    //
    // Dev-mode sibling note: with `reactStrictMode: true`, React 18 dev
    // double-invokes effects with no cleanup, so an authenticated visitor
    // would see `router.push` called twice in local dev only (never in
    // production, and harmless either way — `router.push('/dashboard')`
    // twice is a no-op the second time). Same root cause class as the
    // mocked-`useRouter()` double-push bug above, just triggered by React
    // itself instead of a test double.
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  // AC2 — set when the server returns success: false (wrong password or an
  // unregistered email; the server never distinguishes the two). Its own
  // state, not reused from emailError (field-level, T06) or submitError
  // (T07's storage-write-failure message) — see the module comment above.
  const [credentialError, setCredentialError] = useState(false);
  // AC8 — set only when the API call throws an ApiClientError whose status
  // is >= 500. Its own state, distinct from credentialError (AC2, a
  // `success: false` response body) and submitError (T07's storage-write
  // failure) — see the module comment above.
  const [serverError, setServerError] = useState(false);
  // AC3 — true for the duration of the in-flight request. Drives the
  // button's visual loading/spinner state and the read-only inputs. Not
  // relied on for the double-submit guard itself (see isSubmittingRef
  // below) — review cycle 1 BLOCKER found that a `useState` value read in
  // handleSubmit's closure is stale for a second same-tick invocation,
  // since `setIsLoading(true)` does not flush synchronously under React
  // 18's automatic batching.
  const [isLoading, setIsLoading] = useState(false);
  // AC3 — the actual double-submit guard. A `useRef` is a plain mutable
  // object: reading/writing it happens synchronously and immediately,
  // outside React's state/batching machinery, so it correctly sees a
  // same-tick second invocation that a `useState`-based check cannot (live
  // verification: two `form.requestSubmit()` calls in the same script tick
  // produced two real POST requests against the old `isLoading`-only
  // guard).
  const isSubmittingRef = useRef(false);
  // AC7 — password is masked by default (type="password"); the toggle
  // flips this to reveal the plaintext value and flips it back to re-mask.
  const [showPassword, setShowPassword] = useState(false);

  // AC4/AC5 — validate before any network call. A validation failure sets
  // the inline error and returns, so no request is ever sent. A passing
  // email clears the error and falls through to the AC1 submit flow.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // AC3 — code-level guard: a second submit while one is already in
    // flight must not fire a second request. This must be the very first
    // statement (before any setState call, including the validation
    // branch below), and must read/write the ref, not `isLoading` state —
    // see the comment on isSubmittingRef above.
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;

    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      // Validation failed before any request was ever attempted, so the
      // guard must release here too — this is the one exit path that
      // isn't covered by the `finally` block below (that block only runs
      // once we're inside the try, i.e. once validation has passed).
      isSubmittingRef.current = false;
      return;
    }

    setEmailError(undefined);
    setSubmitError(undefined);
    setCredentialError(false);
    setServerError(false);
    setIsLoading(true);

    // AC1 — valid credentials: store the session token and redirect to
    // /dashboard. The response is a discriminated union (success/failure)
    // validated against the published contract. A `success: false` body
    // (AC2 — wrong password or an unregistered email, same banner either
    // way) shows the banner and stays on /login with the email field
    // untouched (it is never cleared on this branch). AC8 — a thrown
    // ApiClientError whose status is >= 500 shows the server-error banner;
    // anything else thrown (a network failure/CORS error with no status at
    // all, or an ApiClientError for a response that failed contract
    // validation with a non-5xx status) remains a silent no-op, since none
    // of those are "the server returns a 5xx" as AC8 specifically states.
    try {
      const response = await authService().post(
        auth.AUTH_ROUTES.login,
        { email, password },
        auth.loginResponseSchema,
      );
      if (!response.success) {
        setCredentialError(true);
        return;
      }

      // Deliberately its own nested try/catch, not folded into the single
      // catch below: the server-side login has already succeeded by this
      // point, so a failure here (cr-in-memory-session: `storeSessionToken`
      // now dispatches to the in-memory `session` Redux slice rather than
      // writing to localStorage — see `@/lib/session-storage` — so the
      // realistic failure mode is the store not being initialized yet
      // rather than a storage-quota/private-mode error, but the guarantee
      // this guards is the same) is not a credential error and not a
      // network/server error — conflating it with either (the outer catch)
      // would make a genuinely successful login silently vanish with zero
      // signal. No dedicated UI for this exists yet (out of scope for
      // T07/T08/T09), so it's surfaced with a console.error plus a generic
      // inline message instead (review cycle 1 BLOCKER).
      try {
        storeSessionToken(response.data.token);
      } catch (storageError) {
        console.error('Failed to persist session token after a successful login', storageError);
        setSubmitError(
          'You were signed in, but we could not save your session on this device. Please try again.',
        );
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError && err.status >= 500) {
        setServerError(true);
      }
    } finally {
      // AC8 — "the form returns to its default (non-loading) state" after
      // a 5xx. Using `finally` rather than repeating this in every branch
      // above also gives AC3 the same guarantee on every other exit path
      // (success, credential error, storage-write failure, and any other
      // silently-swallowed thrown error). isSubmittingRef is released here
      // too, alongside isLoading, since every exit path from inside the
      // try (success, credential error, storage-write failure, and any
      // thrown error) funnels through this block.
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }

  // AC6 — still checking for a session, or a valid one was found and the
  // redirect to /dashboard is underway: render a minimal loading state,
  // never the sign-in form. Neither the PRD nor login-default.png draws
  // this state (it only draws the signed-out form); a small centered
  // spinner reusing the same `Loader2` icon Button's own loading state
  // already uses elsewhere on this screen is a deliberate, logged default
  // rather than a blank white page — see DECISIONS.md (T11).
  if (sessionStatus !== 'unauthenticated') {
    return (
      <div
        role="status"
        className="flex w-full max-w-[380px] flex-col items-center gap-3 py-16"
      >
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[380px] flex-col items-center gap-6">
      {/* Logo placeholder — wireframe draws a dashed box, no real logo asset
          exists yet. Shrinks below 480px per the wireframes' responsive intent. */}
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-400 min-[480px]:h-16 min-[480px]:w-16 min-[480px]:text-xs"
      >
        logo
      </div>

      <Card className="w-full">
        <CardHeader className="flex flex-col items-center gap-1 text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your work email to continue</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* AC2 — credential-mismatch banner, matching
              docs/wireframes/login/login-error.png: an alert icon plus the
              exact contract-sourced message (shared/contracts/src/auth),
              never a hardcoded duplicate. Distinct element from Field's
              inline `error` prop per the wireframes' index.md notes. */}
          {credentialError ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
              {auth.LOGIN_INVALID_CREDENTIALS_MESSAGE}
            </p>
          ) : null}

          {/* AC8 — server-error banner, matching
              docs/wireframes/login/login-error.png's banner styling but
              with its own text. Distinct element from credentialError
              (AC2) and submitError (T07's storage-write-failure message) —
              see the module comment above. */}
          {serverError ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
              {SERVER_ERROR_MESSAGE}
            </p>
          ) : null}

          {/* Storage-write failure after a successful server login (see
              handleSubmit) — not one of T08/T09's designed banners, so
              rendered as a minimal generic inline message rather than
              matching any wireframe-specific error styling. */}
          {submitError ? (
            <p role="alert" className="text-sm text-red-600">
              {submitError}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* AC9 — focus is in the email field on page load. */}
            <Field
              label="Email"
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={isLoading}
              disabled={isLoading}
              {...(emailError ? { error: emailError } : {})}
            />

            <div className="relative">
              {/* AC7 — masked by default (type="password"); the toggle below
                  flips `showPassword` to reveal/re-mask the value. */}
              <Field
                label="Password"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                readOnly={isLoading}
                disabled={isLoading}
                className="pr-10"
              />
              {/* AC7/AC9 — a real, keyboard-reachable toggle (T10; previously
                  a decorative `aria-hidden` span per T05's note). `aria-pressed`
                  plus a dynamic `aria-label` announce the current state to a
                  screen reader; DOM position between the password input and
                  the "Forgot password?" link gives it the AC9-required Tab
                  order (email -> password -> toggle -> forgot password ->
                  submit) for free, without an explicit `tabIndex`.
                  Review cycle 1 NIT: `bottom-1 right-1` is anchored to the
                  whole `div.relative` wrapper (label + gap + input), not the
                  input itself, and only self-centers on the input today
                  because this password field never renders a `Field` error.
                  If this icon-in-field pattern is ever reused on a field
                  that *can* show a validation error, the growing error text
                  beneath the input will push the input up within the
                  wrapper while this icon stays anchored to the wrapper's
                  bottom edge, breaking the alignment — anchor to the input
                  directly (e.g. wrap just the input, not the whole `Field`)
                  in that case instead of copying this positioning as-is. */}
              <IconButton
                label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
                className="absolute bottom-1 right-1"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </IconButton>
            </div>

            {/* AC11 — activating this link navigates to /forgot-password. The
                flow behind that route is out of scope for this PRD (§5). */}
            <Link
              href="/forgot-password"
              className="self-end text-sm text-sky-700 hover:text-sky-800 hover:underline"
            >
              Forgot password?
            </Link>

            {/* AC3 — while the request is in flight, `loading` disables the
                button (Button's own behavior) and shows the spinner drawn
                on docs/wireframes/login/login-loading.png, and the label
                switches to "Signing in..." to match. */}
            <Button type="submit" className="w-full" loading={isLoading} disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <hr className="border-slate-200" />

          <p className="text-center text-sm text-slate-500">
            Need an account? Contact your administrator
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
