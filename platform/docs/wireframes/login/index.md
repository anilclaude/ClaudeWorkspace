# Login — wireframes

Source: _(link to the design file — Figma/Excalidraw/whatever is the source of truth)_
PRD: [`docs/prd/_ACTIVE/login.md`](../../prd/_ACTIVE/login.md)
Status: Active

## Screens

| Screen | File | Implements | State shown |
|---|---|---|---|
| Sign-in form | `login-default.png` | AC1, AC6, AC7, AC9, AC11 | default |
| Errors | `login-error.png` | AC2, AC4, AC5, AC8 | error |
| Submitting | `login-loading.png` | AC3 | loading |

Each PNG carries its ACs in the right-hand gutter, so the binding is visible in
the image as well as in this table.

## Responsive intent

Mobile-first. The card is `max-width: 380px` and centres in the viewport; below
`480px` it goes full-width with 16px side padding and the logo shrinks. No
layout change is needed above `768px` — this screen never becomes multi-column.

## Empty state

Not applicable — this screen has no collection to be empty. The default state
*is* the empty form.

## States not drawn

- **AC10 (session persistence)** — no visual. Reloading an authenticated page
  simply does not return to this screen; covered by AC6's redirect.
- **AC11 (forgot password target)** — the link is drawn on `login-default.png`;
  the `/forgot-password` screen it navigates to is a separate PRD and is not
  wireframed here.
- **Signed out by expiry** — when a session expires elsewhere in the app, the
  user arrives here with a neutral banner reading "Your session expired. Please
  sign in again." Same layout as `login-error.png`, informational styling rather
  than error styling.

## Notes for the builder

- The error banner and the inline field error in `login-error.png` are
  intentionally both present. The banner covers form-level failures (AC2, AC8);
  the inline message covers field-level ones (AC4, AC5). Do not collapse them
  into one.
- There is no rate-limited or locked-out state in this release — throttling is
  explicitly out of scope (see the PRD §5 note). If it returns, it needs its own
  screen; do not improvise one.
