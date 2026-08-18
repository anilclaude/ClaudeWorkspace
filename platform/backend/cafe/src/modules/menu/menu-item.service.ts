import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { cafe } from '@app/contracts';
import { MenuItem } from './entities/menu-item.entity';
import { MenuCategory } from './entities/menu-category.entity';

// T04 — item create. Mirrors MenuCategoryService's pattern: constructor-
// injected TypeORM repositories, no raw SQL. Two repositories rather than
// one (unlike MenuCategoryService) because create() needs to check the
// referenced category actually exists (AC5) before writing the item.
@Injectable()
export class MenuItemService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly itemsRepository: Repository<MenuItem>,
    @InjectRepository(MenuCategory)
    private readonly categoriesRepository: Repository<MenuCategory>,
  ) {}

  // AC1 (name/category/price required) and AC2/VC-001 (price > 0) are
  // already enforced by createMenuItemRequestSchema in the controller before
  // this method is ever called — not re-validated here.
  //
  // AC5 ("every item belongs to exactly one category") needs more than the
  // schema can give: categoryId is a well-formed, non-empty string by the
  // time it reaches here, but nothing yet confirms it names a *real*
  // category. Two ways to enforce that:
  //   1. Rely on the DB's FK constraint alone (menu_items.category_id
  //      REFERENCES menu_categories(id), added in T02's migration) — it
  //      already rejects a dangling categoryId (proven live by T02's own
  //      "rejects an item referencing a nonexistent category" int-spec).
  //   2. Also check existence here, before the insert.
  //
  // Went with both: the FK stays as the last-line, can't-be-bypassed
  // guarantee, but an uncaught FK violation surfaces to Nest as a raw
  // QueryFailedError -> 500, not a clean 400 naming the problem the way
  // VC-002 already expects for the sibling required-field case. This
  // existence check turns that into the same BadRequestException shape as
  // every other create() validation failure. Genuine judgment call — PRD/AC5
  // doesn't pin the response shape for this specific case — logged in
  // scaffold/memory/DECISIONS.md ("cafe-menu-management T04").
  async create(request: cafe.CreateMenuItemRequest): Promise<MenuItem> {
    const categoryExists = await this.categoriesRepository.exists({
      where: { id: request.categoryId },
    });
    if (!categoryExists) {
      throw new BadRequestException(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);
    }

    const item = this.itemsRepository.create({
      categoryId: request.categoryId,
      name: request.name,
      price: request.price,
      description: request.description ?? null,
      imageUrl: request.imageUrl ?? null,
    });
    return this.itemsRepository.save(item);
  }

  // T05 — admin view (all items, regardless of availability). AC3 requires
  // an unavailable item to stay visible here (see the wireframe's Unavailable
  // badge shown alongside Available ones in the same list).
  async findAll(): Promise<MenuItem[]> {
    return this.orderedQuery().getMany();
  }

  // T05 — available-items query method (VC-003: an unavailable item is
  // absent from this list while still present in findAll()'s). Filters on
  // the same isAvailable column T06 will toggle.
  async findAvailable(): Promise<MenuItem[]> {
    return this.orderedQuery()
      .andWhere('item.isAvailable = :isAvailable', { isAvailable: true })
      .getMany();
  }

  // T06 — AC3/AC4: partial update via PATCH /menu/items/:id, primarily the
  // isAvailable toggle, but re-validates the same categoryId-exists
  // constraint create() enforces (AC5 still applies to an update) when
  // categoryId is present in the request. name/price/description/imageUrl
  // are not re-checked here beyond what updateMenuItemRequestSchema already
  // enforces at the controller boundary (same division of labor as
  // create()) — categoryId needs the extra existence check because, like
  // create(), the schema can only confirm it's a well-formed string, not
  // that it names a real row. Not-found behavior (a PATCH against an id that
  // doesn't exist) is unpinned by any AC/VC/wireframe — 404 is the
  // defensible REST-conventional default, logged in
  // scaffold/memory/DECISIONS.md ("cafe-menu-management T06").
  async update(id: string, request: cafe.UpdateMenuItemRequest): Promise<MenuItem> {
    const item = await this.itemsRepository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(cafe.MENU_ITEM_NOT_FOUND_MESSAGE);
    }

    if (request.categoryId !== undefined) {
      const categoryExists = await this.categoriesRepository.exists({
        where: { id: request.categoryId },
      });
      if (!categoryExists) {
        throw new BadRequestException(cafe.MENU_ITEM_CATEGORY_NOT_FOUND_MESSAGE);
      }
      item.categoryId = request.categoryId;
    }
    if (request.name !== undefined) {
      item.name = request.name;
    }
    if (request.price !== undefined) {
      item.price = request.price;
    }
    if (request.description !== undefined) {
      item.description = request.description;
    }
    if (request.imageUrl !== undefined) {
      item.imageUrl = request.imageUrl;
    }
    if (request.isAvailable !== undefined) {
      item.isAvailable = request.isAvailable;
    }

    return this.itemsRepository.save(item);
  }

  // Shared ordering for both read paths (T05's ledger note: "establishes the
  // two read paths T06's toggle test proves AC3/VC-003 against" — both must
  // agree on ordering, or a future consumer diffing the two lists would see
  // unrelated reordering noise alongside the availability difference it's
  // actually looking for).
  //
  // Ordering decision (unpinned by any AC/VC/wireframe for T05 itself — a
  // defensible default per B8, logged in scaffold/memory/DECISIONS.md
  // "cafe-menu-management T05"): category display order first (joins to
  // menu_categories on the existing FK, orders by its sortOrder — the same
  // column AC6/T07's reorder persists), then each item's own createdAt
  // within a category. createdAt (not name) was chosen over alphabetical
  // because cafe-menu-list-default.png's own STARTERS section shows "Spring
  // Rolls" before "Garlic Bread" — not alphabetical order — so creation
  // order is the more wireframe-faithful default; `item.id` is a final
  // tiebreaker for full determinism when two items share a millisecond
  // timestamp (matters for test assertions, not a real product concern).
  // T10's own ledger note says its list component renders "order-as-
  // returned" with no client-side sorting, so this ordering is exactly what
  // ends up on screen.
  private orderedQuery() {
    return this.itemsRepository
      .createQueryBuilder('item')
      .leftJoin('item.category', 'category')
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('item.createdAt', 'ASC')
      .addOrderBy('item.id', 'ASC');
  }
}
