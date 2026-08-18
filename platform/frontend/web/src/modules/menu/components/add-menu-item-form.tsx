'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Select } from '@app/ui';
import { cafe } from '@app/contracts';
import { ApiClientError } from '@app/frontend-core';
import { cafeService } from '@/lib/services';

// Café — Menu Management PRD, T08 (AC1, AC5): the Add Menu Item form's
// default/empty rendering, matching
// docs/wireframes/cafe-menu-management/cafe-menu-add-default.png — Name,
// Category, and Price are marked required (Field/Select's own `*`
// indicator); Photo is optional (no `*`, per index.md's builder note: "don't
// add a validation error for a missing photo"). Two-column field layout
// above 768px, stacking to one column below it per index.md's "Responsive
// intent" section (the same `min-[…]` breakpoint pattern the login PRD's
// page.tsx already uses for its own custom breakpoint).
//
// T09 (AC1, AC2) adds this file's client-side validation, the red banner,
// and the real `POST /menu/items` call, matching
// docs/wireframes/cafe-menu-management/cafe-menu-add-error.png. Per this
// PRD's own P3 AC-coverage table, T09 is bound to AC1/AC2 only — AC5's full
// "categoryId must reference a real category" semantics (server-side
// already, MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE) and the real
// `GET /menu/categories` fetch are both deliberately out of this task's
// scope (scaffold/memory/DECISIONS.md, "cafe-menu-management (T08 review
// escalation resolution)" — a logged user decision not to widen T09 to close
// that gap). categoryId is still validated as "must be non-empty" here,
// since AC1 requires a category be selected before save, same as name/price.
//
// Category options (T08/T09 original state, superseded — see
// cr-add-menu-category-options note further down): rendered as the
// wireframe's own default — a single disabled placeholder option ("Select
// category"), no fetched options yet. Populating real options needed a real
// `GET /menu/categories` call, which is `@RequireRoles('Admin')`-guarded on
// the backend and therefore needed an `Authorization: Bearer <token>`
// header `@app/frontend-core`'s `createApiClient` had no way to attach yet
// at the time (the first authenticated frontend->backend call anywhere in
// this codebase). Deferred past T09 per the logged decision above — closed
// for the list/edit screens by T10/T11, and for this screen's own add flow
// by cr-add-menu-category-options T01. Logged in
// scaffold/memory/DECISIONS.md ("cafe-menu-management T08").
//
// Description: the PRD's `menu_items` table (§7) lists an optional
// `description` column, but neither the wireframe nor the PRD's own US1
// ("As an Admin, I can add a menu item with a name, price, category, and
// photo") draws or mentions one for this screen. Deliberately left off this
// form rather than added speculatively with no visual home — logged in
// scaffold/memory/DECISIONS.md ("cafe-menu-management T08").
//
// Photo: optional, and this PRD has no upload endpoint (already logged OPEN
// in DECISIONS.md, "cafe-menu-management T01"). Rendered as an inert,
// non-interactive placeholder matching the wireframe's dashed "Upload photo"
// box — not a real `<input type="file">`, which would silently accept a
// file selection and do nothing with it.
//
// T11 (AC3, AC4) widens this component in place, rather than a separate
// wrapper, per that task's own dispatch: "add-menu-item-form.tsx (T08/T09)
// is the form to reuse in edit mode." Every new prop below is optional and
// its default preserves T08/T09's exact original behavior when omitted, so
// /menu/new's existing `<AddMenuItemForm />` call site (no props) is
// unaffected. Logged in scaffold/memory/DECISIONS.md
// ("cafe-menu-management T11").
//
// Category options (T11, superseded by cr-add-menu-category-options T01
// below): originally, 'add' mode kept T08's placeholder-only <Select>
// unchanged (still no GET /menu/categories fetch — out of scope for
// /menu/new, per the still-standing T09 decision), while 'edit' mode was a
// different, necessary case flagged directly by T11's own dispatch:
// pre-filling an existing item's categoryId into a <select> requires that
// category to actually exist as an <option>, or the current value won't
// display correctly. EditMenuItemScreen fetches GET /menu/categories
// (reusing T10's exact call, not reinventing it) and passes the result in
// as `categories`.
//
// cr-add-menu-category-options T01 — 'add' mode's placeholder-only
// restriction above is now closed: AddMenuItemScreen (the new wrapper
// behind /menu/new, mirroring EditMenuItemScreen's own shape) fetches
// GET /menu/categories and passes it as `categories` too. The option-
// rendering below no longer branches on `mode` at all — it renders real
// options for whichever mode's caller supplies `categories`. See this
// file's own comment at the <Select> below, and
// scaffold/memory/DECISIONS.md ("cr-add-menu-category-options T01
// (build)").
//
// Availability toggle (AC3/AC4): fires its own immediate PATCH
// /menu/items/:id the moment it's clicked, separate from — and not gated
// behind — the Save Item button's own name/category/price validation.
// AC4's "at any time" language is read as exactly this: an admin can flip
// availability on its own, without the action being blocked by (or having
// to first fix) unrelated field errors, and without waiting on a later
// Save. Placed below the field grid, above the Save/Cancel row — no
// wireframe pins a location since the control isn't drawn anywhere. Logged
// in scaffold/memory/DECISIONS.md ("cafe-menu-management T11").

// AC1 — the exact banner copy from cafe-menu-add-error.png. Purely
// client-owned UI copy (never crosses the service boundary — the zod
// per-field messages below drive the inline errors, this banner is just the
// form-level summary), so it stays a local constant rather than a
// shared/contracts addition, same reasoning as the login PRD's
// SERVER_ERROR_MESSAGE (CLAUDE.md #6 only applies to cross-boundary types).
const VALIDATION_ERROR_BANNER_MESSAGE = 'Please fix the errors below before saving';

// Shown when the real POST call itself fails (network error, or a thrown
// ApiClientError — a non-2xx response) after validation already passed.
// Not drawn on any wireframe (the wireframe only draws the client-validation
// error state), so this is a sensible default distinct from the validation
// banner above, matching the login PRD's SERVER_ERROR_MESSAGE precedent for
// an equivalent "the request itself failed" case.
const SUBMIT_ERROR_MESSAGE = 'Something went wrong saving this item. Try again.';

// T11 — shown when the availability toggle's own immediate PATCH fails
// (network error, or a thrown ApiClientError). Distinct from
// SUBMIT_ERROR_MESSAGE above since it's a different action failing (the
// toggle, not the Save Item form submit) — same separate-banner-per-
// failure-kind pattern this file already establishes.
const TOGGLE_ERROR_MESSAGE = 'Something went wrong updating availability. Try again.';

// cr-menu-item-save-feedback T01 (AC1) — shown after a successful
// POST /menu/items ('add' mode only — this CR's own scope is the Add Menu
// Item form, not the edit/PATCH path). Interpolates the saved item's name
// per AC1's own "<Item name> added" example, so the message is specific to
// this save rather than a generic, indistinguishable confirmation
// (VC-CR-001). Styled consistently with the failure banners above (same
// layout/icon-plus-text shape) but green and `role="status"` rather than
// red and `role="alert"` — a save confirmation is informational, not the
// same assertive-interrupt class as a validation/submit failure, matching
// this file's own `role="status"` precedent (AddMenuItemScreen's loading
// spinner) for non-error states. Logged in scaffold/memory/DECISIONS.md
// ("cr-menu-item-save-feedback T01 (build)").
function buildSuccessMessage(itemName: string): string {
  return `${itemName} added`;
}

// cr-menu-edit-item-save-feedback T01 (AC1, VC-CR-001) — the edit-mode
// sibling of buildSuccessMessage above: same "<Item name> <verb>" shape,
// "updated" instead of "added" so a successful PATCH reads as distinct save
// copy from a successful POST, not identical wording that would make the two
// modes indistinguishable in, say, a screenshot or a support ticket. Reuses
// the exact same `successMessage` state/banner below rather than a second
// one — only one mode is ever mounted per screen instance, so one banner
// serving both is not a conflict. Logged in scaffold/memory/DECISIONS.md
// ("cr-menu-edit-item-save-feedback T01 (build)").
function buildUpdateSuccessMessage(itemName: string): string {
  return `${itemName} updated`;
}

export interface AddMenuItemFormProps {
  /** T11 — 'edit' pre-fills every field from `item`, submits via
   * `PATCH /menu/items/:id` instead of `POST /menu/items`, and shows the
   * Available/Unavailable toggle. Defaults to 'add' (T08/T09's original
   * behavior). */
  mode?: 'add' | 'edit';
  /** Required when `mode === 'edit'` — the item being edited, already
   * resolved by the caller. Ignored in 'add' mode. */
  item?: cafe.MenuItem;
  /** Real fetched category options, for either mode (cr-add-menu-category-
   * options T01 widened this from 'edit'-only) — `AddMenuItemScreen` fetches
   * these for 'add', `EditMenuItemScreen` for 'edit'. With none supplied
   * (or an empty list), the `<Select>` falls back to T08's original
   * placeholder-only default. */
  categories?: cafe.MenuCategory[];
}

// AC1/AC2 — validated on submit only (same as the login PRD's
// validateEmail precedent), reusing shared/contracts' exact copy so the
// backend's own zod messages and this inline text can never drift apart.
function validateName(value: string): string | undefined {
  return value.trim() === '' ? cafe.MENU_ITEM_NAME_REQUIRED_MESSAGE : undefined;
}

function validateCategory(value: string): string | undefined {
  return value.trim() === '' ? cafe.MENU_ITEM_CATEGORY_REQUIRED_MESSAGE : undefined;
}

function validatePrice(value: string): string | undefined {
  if (value.trim() === '') {
    return cafe.MENU_ITEM_PRICE_INVALID_MESSAGE;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? undefined : cafe.MENU_ITEM_PRICE_INVALID_MESSAGE;
}

export function AddMenuItemForm({ mode = 'add', item, categories }: AddMenuItemFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');

  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [categoryError, setCategoryError] = useState<string | undefined>(undefined);
  const [priceError, setPriceError] = useState<string | undefined>(undefined);
  // AC1 — the red "Please fix the errors below before saving" banner, shown
  // whenever submit is attempted with any field-level validation failing.
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  // Failure path for the real POST/PATCH call (network error or non-2xx) —
  // distinct from the validation banner above, same reasoning the login
  // PRD's page.tsx already documents for its own equivalent banners.
  const [submitError, setSubmitError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // cr-menu-item-save-feedback T01 (AC1/AC2) — undefined by default, so it
  // never renders on initial mount/page load (AC2's first half). Set inside
  // the successful 'add'-mode POST branch below, and explicitly cleared both
  // at the start of every new submit attempt and on any field edit (see each
  // field's onChange below), so a stale "X added" message can never linger
  // through — and be mistaken for confirming — an unrelated later action
  // (AC2's second half). cr-menu-edit-item-save-feedback T01 reuses this
  // exact same state/clearing for 'edit' mode's PATCH branch too ("X
  // updated") — one banner serving both modes, since only one mode is ever
  // mounted per screen instance.
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);

  // T11 (AC3/AC4) — the toggle's own state, independent of the form fields
  // above so a validation error on Save Item never blocks it, and a toggle
  // failure never touches the form's own submitError banner.
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState(false);

  // AC1/AC2 — client-side validation gates the submit: a validation failure
  // sets the inline field errors and the banner, and returns before any
  // network call is ever attempted (this task's own wireframe gutter note:
  // "missing name is rejected before submit"). Only once every field passes
  // does this call the real create/update endpoint — POST /menu/items in
  // 'add' mode, PATCH /menu/items/:id in 'edit' mode (T11).
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextNameError = validateName(name);
    const nextCategoryError = validateCategory(categoryId);
    const nextPriceError = validatePrice(price);
    setNameError(nextNameError);
    setCategoryError(nextCategoryError);
    setPriceError(nextPriceError);

    const hasError = Boolean(nextNameError || nextCategoryError || nextPriceError);
    setShowValidationBanner(hasError);
    if (hasError) {
      return;
    }

    setSubmitError(false);
    // cr-menu-item-save-feedback T01 (AC2) — clear any prior success message
    // at the start of every new submit attempt, so a second save (success or
    // failure) never leaves a stale confirmation from the first one on
    // screen while this one is in flight.
    setSuccessMessage(undefined);
    setIsSubmitting(true);
    try {
      if (mode === 'edit' && item) {
        const trimmedName = name.trim();
        const response = await cafeService().patch(
          `${cafe.CAFE_ROUTES.items}/${item.id}`,
          { name: trimmedName, categoryId, price: Number(price) },
          cafe.menuItemResponseSchema,
        );
        if (!response.success) {
          throw new Error('Update responded success: false');
        }
        // cr-menu-edit-item-save-feedback T01 (AC1, VC-CR-001) — success is
        // specific to this save (the just-submitted name), mirroring the
        // 'add' branch's own success-message call below exactly, just with
        // "updated" copy via buildUpdateSuccessMessage.
        setSuccessMessage(buildUpdateSuccessMessage(trimmedName));
      } else {
        // AC5's full "categoryId references a real category" semantics and
        // any resulting success-path UI beyond this CR's own success banner
        // (e.g. a redirect or list refresh) are out of scope — T09 is bound
        // to AC1/AC2 only (per this ledger's P3 table), and this CR
        // explicitly keeps the form on-screen rather than redirecting.
        const trimmedName = name.trim();
        const response = await cafeService().post(
          cafe.CAFE_ROUTES.items,
          { name: trimmedName, categoryId, price: Number(price) },
          cafe.menuItemResponseSchema,
        );
        // cr-menu-item-save-feedback T01 SHOULD-FIX (review) — mirrors the
        // 'edit' mode PATCH branch above: `success: false` on a resolved
        // (non-throwing) response must not be treated as a save. Falls into
        // the same catch/SUBMIT_ERROR_MESSAGE path as a thrown error, rather
        // than setting the success message unconditionally.
        if (!response.success) {
          throw new Error('Create responded success: false');
        }
        // cr-menu-item-save-feedback T01 (AC1, VC-CR-001) — success is
        // specific to this save (the just-submitted name), not a generic
        // state. 'edit' mode (PATCH, above) is out of this CR's scope.
        setSuccessMessage(buildSuccessMessage(trimmedName));
      }
    } catch (err) {
      // Network error, or a thrown ApiClientError (non-2xx — e.g. today's
      // expected 401/403 with no Authorization header attached yet, per the
      // logged decision this task's dispatch cites). Either way, the
      // promise must not be left unhandled — surfaced with a visible error
      // state instead.
      console.error('Failed to save menu item', err instanceof ApiClientError ? err.message : err);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  // T11 (AC3/AC4) — fires immediately on click, not gated behind Save
  // Item's own field validation and not deferred to a later Save (see this
  // file's top-of-file comment for the "at any time" reasoning). Both
  // directions (mark unavailable / mark available again) run through this
  // same handler, flipping the current `isAvailable` value.
  async function handleToggleAvailability() {
    if (!item) return;
    setToggleError(false);
    setIsToggling(true);
    try {
      const response = await cafeService().patch(
        `${cafe.CAFE_ROUTES.items}/${item.id}`,
        { isAvailable: !isAvailable },
        cafe.menuItemResponseSchema,
      );
      if (!response.success) {
        throw new Error('Availability update responded success: false');
      }
      setIsAvailable(response.data.isAvailable);
    } catch (err) {
      console.error('Failed to update availability', err instanceof ApiClientError ? err.message : err);
      setToggleError(true);
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        {/* T11 — same Card/layout as the wireframe, title swapped to reflect
            edit mode rather than kept literally "Add Menu Item" — index.md's
            "reuses the layout" instruction doesn't require reusing the
            title text verbatim on a screen that isn't adding anything. */}
        <CardTitle>{mode === 'edit' ? 'Edit Menu Item' : 'Add Menu Item'}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* AC1 — matches cafe-menu-add-error.png's red banner exactly. Shown
            only when submit was attempted and at least one field failed
            validation; distinct from submitError below (the real POST call
            itself failing), same separate-banner-per-failure-kind pattern
            the login PRD's page.tsx already establishes. */}
        {showValidationBanner ? (
          <p
            role="alert"
            className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
            {VALIDATION_ERROR_BANNER_MESSAGE}
          </p>
        ) : null}

        {submitError ? (
          <p
            role="alert"
            className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
            {SUBMIT_ERROR_MESSAGE}
          </p>
        ) : null}

        {/* cr-menu-item-save-feedback T01 (AC1) — success confirmation after
            a successful POST /menu/items, styled consistently with the
            failure banners above (same layout/icon-plus-text shape), green/
            role="status" instead of red/role="alert". The form intentionally
            stays on screen (no redirect to /menu) — see this file's
            AC1-success comment in handleSubmit — so an admin adding several
            items in a row isn't bounced away each time.
            cr-menu-edit-item-save-feedback T01 (AC1) — the same banner now
            also renders "<Item name> updated" after a successful edit-mode
            PATCH, set in handleSubmit's 'edit' branch above. */}
        {successMessage ? (
          <p
            role="status"
            className="mb-6 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            <CheckCircle2 aria-hidden className="h-4 w-4 flex-shrink-0" />
            {successMessage}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 min-[768px]:grid-cols-2">
            <Field
              label="Name"
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => {
                // cr-menu-item-save-feedback T01 (AC2) — starting an
                // unrelated subsequent edit clears any prior success
                // message, so it can't be mistaken for confirming this new,
                // not-yet-saved change.
                setSuccessMessage(undefined);
                setName(event.target.value);
              }}
              {...(nameError ? { error: nameError } : {})}
            />

            <Select
              label="Category"
              id="categoryId"
              name="categoryId"
              required
              value={categoryId}
              onChange={(event) => {
                setSuccessMessage(undefined);
                setCategoryId(event.target.value);
              }}
              {...(categoryError ? { error: categoryError } : {})}
            >
              {/* cr-add-menu-category-options T01 — the placeholder always
                  renders first (an empty, disabled option — the "no
                  category chosen yet" state validateCategory checks for),
                  followed by every real fetched category if `categories`
                  was passed, regardless of `mode`. Previously gated on
                  `mode === 'edit' && categories`, which is exactly why
                  'add' mode (`/menu/new`) never showed real options even
                  once a `categories` fetch existed for it — the gate cared
                  about `mode`, not whether real data was actually
                  available. Both modes now render identically whenever
                  their caller supplies `categories` (`AddMenuItemScreen`
                  for add, `EditMenuItemScreen` for edit); with no
                  `categories` prop (or an empty list), only the
                  placeholder renders, same as T08's original default. */}
              <option value="" disabled>
                Select category
              </option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Field
              label="Price"
              id="price"
              name="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(event) => {
                setSuccessMessage(undefined);
                setPrice(event.target.value);
              }}
              {...(priceError ? { error: priceError } : {})}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-900">Photo</span>
              <div
                aria-hidden
                className="flex h-[100px] w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400"
              >
                Upload photo
              </div>
            </div>
          </div>

          {/* T11 (AC3/AC4) — not drawn on any wireframe (see this file's
              top-of-file comment for placement/immediate-PATCH reasoning).
              Only rendered in edit mode, where `item` is guaranteed. */}
          {mode === 'edit' && item ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">Availability</span>
              <Badge kind={isAvailable ? 'ok' : 'neutral'}>{isAvailable ? 'Available' : 'Unavailable'}</Badge>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={isToggling}
                disabled={isToggling}
                onClick={handleToggleAvailability}
              >
                {isAvailable ? 'Mark Unavailable' : 'Mark Available'}
              </Button>
            </div>
          ) : null}

          {toggleError ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
              {TOGGLE_ERROR_MESSAGE}
            </p>
          ) : null}

          <div className="flex gap-3">
            {/* T09 — Save Item is now a real submit button (was type="button"
                in T08, per that task's own logged decision on the T08/T09
                split). `loading`/`disabled` while the POST is in flight is a
                sensible default against a double-submit, not an AC/VC this
                task binds to — no dedicated race-condition test is claimed
                for it (contrast the login PRD's AC3, which is explicitly
                bound and tested). */}
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              Save Item
            </Button>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
