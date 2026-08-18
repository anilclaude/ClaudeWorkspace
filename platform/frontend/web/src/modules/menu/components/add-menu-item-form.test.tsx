import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { cafe } from '@app/contracts';
import { AddMenuItemForm } from './add-menu-item-form';

// T09 (AC1, AC2) — client-side validation gating submit, the red banner from
// docs/wireframes/cafe-menu-management/cafe-menu-add-error.png, and the real
// `POST /menu/items` call. `cafeService()` is mocked (its `post` method)
// rather than exercised for real — this suite is about what AddMenuItemForm
// does with a valid/invalid form and the response, not about the
// contract-validated HTTP client itself (its own coverage lives in
// @app/frontend-core).
const postMock = vi.fn();
// T11 — the edit-mode PATCH call (Save Item and the availability toggle
// both use it). Kept in the same top-level mock as postMock so every test
// in this file shares one cafeService() mock shape.
const patchMock = vi.fn();
vi.mock('@/lib/services', () => ({
  cafeService: () => ({ post: postMock, patch: patchMock }),
}));

// The Category <select> only ever renders its disabled "Select category"
// placeholder (no real GET /menu/categories fetch — deliberately out of
// T09's scope per scaffold/memory/DECISIONS.md, "cafe-menu-management (T08
// review escalation resolution)"). To exercise the *accept* half of
// categoryId's validation (B2 — accept and reject both proven, not just
// reject), tests inject a real `<option>` directly, the same shape a future
// populated fetch would produce, rather than reaching into the component's
// internals.
function selectCategory(value: string) {
  const category = screen.getByLabelText(/category/i) as HTMLSelectElement;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  category.appendChild(option);
  fireEvent.change(category, { target: { value } });
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Spring Rolls' } });
  selectCategory('cat-1');
  fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '12.5' } });
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /save item/i }));
}

describe('AddMenuItemForm', () => {
  beforeEach(() => {
    postMock.mockReset();
    patchMock.mockReset();
    postMock.mockResolvedValue({
      success: true,
      data: {
        id: 'item-1',
        categoryId: 'cat-1',
        name: 'Spring Rolls',
        description: null,
        price: 12.5,
        isAvailable: true,
        imageUrl: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    });
  });

  // T08's own default-state coverage (unchanged by T09's submit wiring).
  it('AC1 — Name is marked required and renders as an empty controlled text input', () => {
    render(<AddMenuItemForm />);
    const name = screen.getByLabelText(/name/i) as HTMLInputElement;

    expect(name.value).toBe('');
    expect(name.closest('div')?.querySelector('label')?.textContent).toMatch(/Name\s*\*/);
  });

  it('AC1 — Price is marked required and renders as an empty numeric input with no currency symbol typed', () => {
    render(<AddMenuItemForm />);
    const price = screen.getByLabelText(/price/i) as HTMLInputElement;

    expect(price.value).toBe('');
    expect(price.type).toBe('number');
    expect(price.closest('div')?.querySelector('label')?.textContent).toMatch(/Price\s*\*/);
  });

  it('AC1/AC5 — Category is marked required', () => {
    render(<AddMenuItemForm />);
    const category = screen.getByLabelText(/category/i) as HTMLSelectElement;

    expect(category.closest('div')?.querySelector('label')?.textContent).toMatch(/Category\s*\*/);
  });

  it('Photo has no required marker — optional per the PRD/wireframe (index.md: "don\'t add a validation error for a missing photo")', () => {
    render(<AddMenuItemForm />);
    const photoLabel = screen.getByText('Photo');

    expect(photoLabel.textContent).toBe('Photo');
    expect(screen.getByText('Upload photo')).toBeDefined();
  });

  it('AC5 — Category is a single-select control (not multi-select), defaulting to the wireframe\'s "Select category" placeholder', () => {
    render(<AddMenuItemForm />);
    const category = screen.getByLabelText(/category/i) as HTMLSelectElement;

    expect(category.multiple).toBe(false);
    expect(category.value).toBe('');
    expect(category.selectedOptions).toHaveLength(1);
    expect(within(category).getByText('Select category')).toBeDefined();
  });

  // cr-add-menu-category-options T01 — reject/accept symmetry (B2) for the
  // gate-condition change itself: with no `categories` prop (or an empty
  // list), 'add' mode still falls back to the placeholder-only default
  // (reject half — no real options leak in from nowhere); with real
  // `categories` supplied, 'add' mode now renders them (accept half —
  // previously it never did, gated on `mode === 'edit'`).
  describe('cr-add-menu-category-options T01 — add mode category options', () => {
    const fixtureCategories: cafe.MenuCategory[] = [
      { id: 'cat-1', name: 'Starters', sortOrder: 0 },
      { id: 'cat-2', name: 'Mains', sortOrder: 1 },
    ];

    it('reject: no categories prop in add mode still renders only the placeholder', () => {
      render(<AddMenuItemForm mode="add" />);
      const category = screen.getByLabelText(/category/i) as HTMLSelectElement;

      expect(category.options).toHaveLength(1);
      expect(within(category).getByText('Select category')).toBeDefined();
    });

    it('reject: an empty categories array in add mode also renders only the placeholder', () => {
      render(<AddMenuItemForm mode="add" categories={[]} />);
      const category = screen.getByLabelText(/category/i) as HTMLSelectElement;

      expect(category.options).toHaveLength(1);
    });

    it('accept: AC1/VC-CR-001 — a populated categories array in add mode renders exactly N real options plus the placeholder, not zero', () => {
      render(<AddMenuItemForm mode="add" categories={fixtureCategories} />);
      const category = screen.getByLabelText(/category/i) as HTMLSelectElement;

      expect(category.options).toHaveLength(fixtureCategories.length + 1);
      expect(within(category).getByText('Starters')).toBeDefined();
      expect(within(category).getByText('Mains')).toBeDefined();
    });

    it('AC2 — selecting one of the real fetched options and submitting a valid form calls POST with that categoryId', async () => {
      render(<AddMenuItemForm mode="add" categories={fixtureCategories} />);
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Spring Rolls' } });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'cat-2' } });
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '12.5' } });

      clickSave();

      await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
      expect(postMock).toHaveBeenCalledWith(
        cafe.CAFE_ROUTES.items,
        expect.objectContaining({ categoryId: 'cat-2' }),
        cafe.menuItemResponseSchema,
      );
    });
  });

  it('Save Item is a real submit button and Cancel stays inert, matching the T08/T09 scope split', () => {
    render(<AddMenuItemForm />);
    const save = screen.getByRole('button', { name: /save item/i });
    const cancel = screen.getByRole('button', { name: /cancel/i });

    // T09 rewires Save Item to type="submit" (was type="button" in T08).
    expect(save.getAttribute('type')).toBe('submit');
    // Cancel stays inert — this task's scope is Save Item's validation/
    // submit path only, not a Cancel handler.
    expect(cancel.getAttribute('type')).toBe('button');
  });

  // AC1 — reject/accept symmetry (B2) for the name field.
  describe('AC1 — name required', () => {
    it('reject: an empty name shows the banner and "Name is required" inline error, and no POST is attempted', async () => {
      render(<AddMenuItemForm />);
      selectCategory('cat-1');
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '12.5' } });

      clickSave();

      await screen.findByRole('alert');
      expect(screen.getByText('Please fix the errors below before saving')).toBeDefined();
      expect(screen.getByText(cafe.MENU_ITEM_NAME_REQUIRED_MESSAGE)).toBeDefined();
      expect(postMock).not.toHaveBeenCalled();
    });

    it('reject: a whitespace-only name is also rejected as required', async () => {
      render(<AddMenuItemForm />);
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '   ' } });
      selectCategory('cat-1');
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '12.5' } });

      clickSave();

      await waitFor(() => expect(screen.getByText(cafe.MENU_ITEM_NAME_REQUIRED_MESSAGE)).toBeDefined());
      expect(postMock).not.toHaveBeenCalled();
    });

    it('accept: a non-empty name passes validation — no "Name is required" error, and the POST is attempted', async () => {
      render(<AddMenuItemForm />);
      fillValidForm();

      clickSave();

      await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByText(cafe.MENU_ITEM_NAME_REQUIRED_MESSAGE)).toBeNull();
      expect(screen.queryByText('Please fix the errors below before saving')).toBeNull();
    });
  });

  // AC1 — reject/accept symmetry (B2) for the category field. AC5's full
  // "categoryId references a real category" semantics are out of this
  // task's scope — only "must be non-empty" is validated here.
  describe('AC1 — category required', () => {
    it('reject: no category selected shows the banner and a "Category is required" inline error, and no POST is attempted', async () => {
      render(<AddMenuItemForm />);
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Spring Rolls' } });
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '12.5' } });

      clickSave();

      await waitFor(() =>
        expect(screen.getByText(cafe.MENU_ITEM_CATEGORY_REQUIRED_MESSAGE)).toBeDefined(),
      );
      expect(screen.getByText('Please fix the errors below before saving')).toBeDefined();
      expect(postMock).not.toHaveBeenCalled();
    });

    it('accept: a selected category passes validation — no "Category is required" error, and the POST is attempted with that categoryId', async () => {
      render(<AddMenuItemForm />);
      fillValidForm();

      clickSave();

      await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByText(cafe.MENU_ITEM_CATEGORY_REQUIRED_MESSAGE)).toBeNull();
      expect(postMock).toHaveBeenCalledWith(
        cafe.CAFE_ROUTES.items,
        expect.objectContaining({ categoryId: 'cat-1' }),
        cafe.menuItemResponseSchema,
      );
    });
  });

  // AC2 — reject/accept symmetry (B2) for the price field.
  describe('AC2 — price must be a positive number', () => {
    it('reject: a price of "0" shows the banner and "Price must be greater than zero", and no POST is attempted (matches cafe-menu-add-error.png)', async () => {
      render(<AddMenuItemForm />);
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Spring Rolls' } });
      selectCategory('cat-1');
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '0' } });

      clickSave();

      await waitFor(() =>
        expect(screen.getByText(cafe.MENU_ITEM_PRICE_INVALID_MESSAGE)).toBeDefined(),
      );
      expect(screen.getByText('Please fix the errors below before saving')).toBeDefined();
      expect(postMock).not.toHaveBeenCalled();
    });

    it('reject: a negative price is also rejected', async () => {
      render(<AddMenuItemForm />);
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Spring Rolls' } });
      selectCategory('cat-1');
      fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '-5' } });

      clickSave();

      await waitFor(() =>
        expect(screen.getByText(cafe.MENU_ITEM_PRICE_INVALID_MESSAGE)).toBeDefined(),
      );
      expect(screen.getByText('Please fix the errors below before saving')).toBeDefined();
      expect(postMock).not.toHaveBeenCalled();
    });

    it('accept: a positive price passes validation — no price error, and the POST is attempted with a numeric price', async () => {
      render(<AddMenuItemForm />);
      fillValidForm();

      clickSave();

      await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByText(cafe.MENU_ITEM_PRICE_INVALID_MESSAGE)).toBeNull();
      expect(postMock).toHaveBeenCalledWith(
        cafe.CAFE_ROUTES.items,
        expect.objectContaining({ price: 12.5 }),
        cafe.menuItemResponseSchema,
      );
    });
  });

  it('an implicit (Enter-key-style) native form submit now runs the same validation, unlike T08\'s inert handler', async () => {
    const { container } = render(<AddMenuItemForm />);
    const form = container.querySelector('form')!;

    fireEvent.submit(form);

    // Every field is empty, so validation must reject and show the banner —
    // proof the handler now does real work on a native submit, not just
    // `preventDefault()` (T08's prior behavior).
    await waitFor(() =>
      expect(screen.getByText('Please fix the errors below before saving')).toBeDefined(),
    );
    expect(postMock).not.toHaveBeenCalled();
  });

  it('the POST call\'s failure path (network error / non-2xx) shows a visible error state rather than an unhandled rejection', async () => {
    postMock.mockReset();
    postMock.mockRejectedValue(new Error('network error'));
    render(<AddMenuItemForm />);
    fillValidForm();

    clickSave();

    await waitFor(() =>
      expect(screen.getByText('Something went wrong saving this item. Try again.')).toBeDefined(),
    );
  });

  // cr-menu-item-save-feedback T01 — AC1/AC2/AC3: success feedback on the
  // Add Menu Item form after a successful POST /menu/items.
  describe('cr-menu-item-save-feedback T01 — success feedback', () => {
    it('AC2 — no success message renders on initial page load', () => {
      render(<AddMenuItemForm />);

      expect(screen.queryByRole('status')).toBeNull();
    });

    it('AC1/VC-CR-001 — after a successful save, a visible success message names the saved item, and the form stays on screen (no redirect/unmount)', async () => {
      render(<AddMenuItemForm />);
      fillValidForm();

      clickSave();

      const status = await screen.findByRole('status');
      expect(status.textContent).toContain('Spring Rolls added');
      // Still on screen — the Save Item button (and the rest of the form)
      // is still rendered, proving this isn't a redirect/unmount.
      expect(screen.getByRole('button', { name: /save item/i })).toBeDefined();
    });

    it('AC2 — starting to fill the form again after a successful save clears the success message, so the new unsaved edit isn\'t mistaken for another successful save', async () => {
      render(<AddMenuItemForm />);
      fillValidForm();
      clickSave();
      await screen.findByRole('status');

      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Spring Rolls Deluxe' } });

      expect(screen.queryByRole('status')).toBeNull();
    });

    it('AC2 — submitting again after a successful save clears the prior success message while the new save is in flight', async () => {
      render(<AddMenuItemForm />);
      fillValidForm();
      clickSave();
      await screen.findByRole('status');

      postMock.mockReset();
      postMock.mockImplementation(() => new Promise(() => {})); // never resolves — inspect mid-flight state
      clickSave();

      await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('AC3 — the failure path is unchanged: a failed save shows only the existing error banner, never the success message', async () => {
      postMock.mockReset();
      postMock.mockRejectedValue(new Error('network error'));
      render(<AddMenuItemForm />);
      fillValidForm();

      clickSave();

      await waitFor(() =>
        expect(screen.getByText('Something went wrong saving this item. Try again.')).toBeDefined(),
      );
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('AC3 — the validation-error banner path is unchanged: an invalid submit shows the existing banner, never the success message', async () => {
      render(<AddMenuItemForm />);

      clickSave();

      await screen.findByRole('alert');
      expect(screen.getByText('Please fix the errors below before saving')).toBeDefined();
      expect(screen.queryByRole('status')).toBeNull();
      expect(postMock).not.toHaveBeenCalled();
    });

    // Review SHOULD-FIX (cr-menu-item-save-feedback T01) — the POST branch
    // must check `response.success` the same way the sibling PATCH branch
    // already does, not treat a resolved promise as an automatic success.
    // This is currently unreachable via the real backend (its controller
    // only ever resolves 2xx with success: true), so it's mocked directly
    // here to prove the guard exists rather than relying on backend
    // behavior to keep it exercised.
    it('AC3 — a resolved POST with success: false does not show the success message, and falls into the existing error-banner path', async () => {
      postMock.mockReset();
      postMock.mockResolvedValue({ success: false, data: null, error: { message: 'boom' } });
      render(<AddMenuItemForm />);
      fillValidForm();

      clickSave();

      await waitFor(() =>
        expect(screen.getByText('Something went wrong saving this item. Try again.')).toBeDefined(),
      );
      expect(screen.queryByRole('status')).toBeNull();
    });
  });

  // T11 (AC3, AC4) — edit mode: pre-fill, PATCH-not-POST on submit, and the
  // Available/Unavailable toggle (both directions).
  describe('edit mode (T11)', () => {
    const fixtureItem: cafe.MenuItem = {
      id: 'item-1',
      categoryId: 'cat-2',
      name: 'Garlic Bread',
      description: null,
      price: 6.5,
      isAvailable: true,
      imageUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const fixtureCategories: cafe.MenuCategory[] = [
      { id: 'cat-1', name: 'Starters', sortOrder: 0 },
      { id: 'cat-2', name: 'Mains', sortOrder: 1 },
    ];

    beforeEach(() => {
      patchMock.mockReset();
      patchMock.mockResolvedValue({
        success: true,
        data: { ...fixtureItem, isAvailable: false },
        error: null,
      });
    });

    it('pre-fills name, category, and price from the fetched item, and renders every fetched category as a real option', () => {
      render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);

      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Garlic Bread');
      expect((screen.getByLabelText(/price/i) as HTMLInputElement).value).toBe('6.5');
      const category = screen.getByLabelText(/category/i) as HTMLSelectElement;
      expect(category.value).toBe('cat-2');
      expect(within(category).getByText('Starters')).toBeDefined();
      expect(within(category).getByText('Mains')).toBeDefined();
    });

    it('the title reflects edit mode', () => {
      render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);
      expect(screen.getByText('Edit Menu Item')).toBeDefined();
    });

    it('submitting Save Item calls PATCH /menu/items/:id with the edited fields, not POST', async () => {
      render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Garlic Bread Deluxe' } });

      clickSave();

      await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1));
      expect(patchMock).toHaveBeenCalledWith(
        `${cafe.CAFE_ROUTES.items}/item-1`,
        { name: 'Garlic Bread Deluxe', categoryId: 'cat-2', price: 6.5 },
        cafe.menuItemResponseSchema,
      );
      expect(postMock).not.toHaveBeenCalled();
    });

    it('AC3 — clicking the toggle while available marks the item unavailable via an immediate PATCH, distinct from Save Item', async () => {
      patchMock.mockResolvedValueOnce({
        success: true,
        data: { ...fixtureItem, isAvailable: false },
        error: null,
      });
      render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);
      expect(screen.getByText('Available')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: /mark unavailable/i }));

      await waitFor(() =>
        expect(patchMock).toHaveBeenCalledWith(
          `${cafe.CAFE_ROUTES.items}/item-1`,
          { isAvailable: false },
          cafe.menuItemResponseSchema,
        ),
      );
      await screen.findByText('Unavailable');
      // The toggle is its own action — Save Item's own POST/PATCH must not
      // have fired as a side effect of clicking it.
      expect(postMock).not.toHaveBeenCalled();
    });

    it('AC4 — clicking the toggle while unavailable marks the item available again via an immediate PATCH', async () => {
      const unavailableItem: cafe.MenuItem = { ...fixtureItem, isAvailable: false };
      patchMock.mockResolvedValueOnce({
        success: true,
        data: { ...fixtureItem, isAvailable: true },
        error: null,
      });
      render(<AddMenuItemForm mode="edit" item={unavailableItem} categories={fixtureCategories} />);
      expect(screen.getByText('Unavailable')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: /mark available/i }));

      await waitFor(() =>
        expect(patchMock).toHaveBeenCalledWith(
          `${cafe.CAFE_ROUTES.items}/item-1`,
          { isAvailable: true },
          cafe.menuItemResponseSchema,
        ),
      );
      await screen.findByText('Available');
    });

    it('the toggle failing (network error / non-2xx) shows a visible error state without changing the badge', async () => {
      patchMock.mockReset();
      patchMock.mockRejectedValueOnce(new Error('network error'));
      render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);

      fireEvent.click(screen.getByRole('button', { name: /mark unavailable/i }));

      await waitFor(() =>
        expect(screen.getByText('Something went wrong updating availability. Try again.')).toBeDefined(),
      );
      expect(screen.getByText('Available')).toBeDefined();
    });

    // cr-menu-edit-item-save-feedback T01 — AC1/AC2/AC3: success feedback on
    // the Edit Menu Item form after a successful PATCH /menu/items/:id,
    // extending the same successMessage mechanism cr-menu-item-save-feedback
    // T01 built for 'add' mode. Reuses this describe block's own
    // fixtureItem/fixtureCategories/patchMock rather than re-declaring them.
    describe('cr-menu-edit-item-save-feedback T01 — edit mode success feedback', () => {
      it('AC2 — no success message renders on initial render of the edit form', () => {
        render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);

        expect(screen.queryByRole('status')).toBeNull();
      });

      it('AC1/VC-CR-001 — after a successful save, a visible success message names the saved item with "updated" copy, distinct from add-mode\'s "added", and the form stays on screen', async () => {
        render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);
        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Garlic Bread Deluxe' } });

        clickSave();

        const status = await screen.findByRole('status');
        expect(status.textContent).toContain('Garlic Bread Deluxe updated');
        expect(status.textContent).not.toContain('added');
        // Still on screen — proof this isn't a redirect/unmount, same as
        // add-mode's own equivalent assertion.
        expect(screen.getByRole('button', { name: /save item/i })).toBeDefined();
      });

      it('AC2 — editing a field again after a successful save clears the success message', async () => {
        render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);
        clickSave();
        await screen.findByRole('status');

        fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Garlic Bread Supreme' } });

        expect(screen.queryByRole('status')).toBeNull();
      });

      it('AC2 — submitting again after a successful save clears the prior success message while the new save is in flight', async () => {
        render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);
        clickSave();
        await screen.findByRole('status');

        patchMock.mockReset();
        patchMock.mockImplementation(() => new Promise(() => {})); // never resolves — inspect mid-flight state
        clickSave();

        await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole('status')).toBeNull();
      });

      it('AC3 — the existing failure path is unchanged: a failed PATCH shows only SUBMIT_ERROR_MESSAGE, never the success message', async () => {
        patchMock.mockReset();
        patchMock.mockRejectedValue(new Error('network error'));
        render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);

        clickSave();

        await waitFor(() =>
          expect(screen.getByText('Something went wrong saving this item. Try again.')).toBeDefined(),
        );
        expect(screen.queryByRole('status')).toBeNull();
      });

      it('AC3 — a resolved PATCH with success: false does not show the success message, and falls into the existing error-banner path', async () => {
        patchMock.mockReset();
        patchMock.mockResolvedValue({ success: false, data: null, error: { message: 'boom' } });
        render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);

        clickSave();

        await waitFor(() =>
          expect(screen.getByText('Something went wrong saving this item. Try again.')).toBeDefined(),
        );
        expect(screen.queryByRole('status')).toBeNull();
      });

      it('AC3 — the availability toggle\'s own success/failure behavior is unaffected: toggling still flips the badge via its own PATCH, independent of Save Item\'s success message', async () => {
        patchMock.mockResolvedValueOnce({
          success: true,
          data: { ...fixtureItem, isAvailable: false },
          error: null,
        });
        render(<AddMenuItemForm mode="edit" item={fixtureItem} categories={fixtureCategories} />);
        expect(screen.getByText('Available')).toBeDefined();

        fireEvent.click(screen.getByRole('button', { name: /mark unavailable/i }));

        await screen.findByText('Unavailable');
        // The toggle's own action never sets Save Item's success message —
        // only a Save Item PATCH does (see the AC1 test above).
        expect(screen.queryByRole('status')).toBeNull();
      });
    });
  });
});
