import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { cafe } from '@app/contracts';
import { MenuCategory } from './entities/menu-category.entity';

// T03 — category read/create. Mirrors backend/auth/src/modules/auth/auth.service.ts's
// pattern: a constructor-injected TypeORM repository, no raw SQL.
@Injectable()
export class MenuCategoryService {
  constructor(
    @InjectRepository(MenuCategory)
    private readonly categoriesRepository: Repository<MenuCategory>,
  ) {}

  // AC6 depends on this ordering (T07 persists sortOrder, T10 displays in
  // this order) — ascending sortOrder is the list order per the contract's
  // menuCategorySchema comment.
  async findAll(): Promise<MenuCategory[]> {
    return this.categoriesRepository.find({ order: { sortOrder: 'ASC' } });
  }

  // sortOrder is server-assigned, appended to the end — matches
  // createMenuCategoryRequestSchema's comment in shared/contracts/src/cafe/menu.ts.
  // Categories are never deleted anywhere in this PRD's ledger (T02's FK is
  // ON DELETE RESTRICT with no delete-category task planned), so existing
  // sortOrder values stay a contiguous 0..n-1 range and a plain row count is
  // equivalent to "the next index" — no gap-filling logic needed.
  //
  // Known, accepted gap (review cycle 1, logged in scaffold/memory/DECISIONS.md,
  // "cafe-menu-management T03"): count() is read and used non-atomically —
  // two concurrent POST /menu/categories requests can both read the same
  // count() before either save() commits, and each persists a category with
  // the identical sortOrder. This is NOT a transient state that resolves
  // itself (unlike a mid-reorder race): the duplicate sortOrder persists in
  // the table indefinitely until an explicit reorder rewrites every row's
  // sortOrder wholesale. T07's reorderCategories() below is exactly that
  // rewrite — running it after a duplicate-sortOrder create() race closes
  // the gap in practice (every row gets a fresh, contiguous 0..n-1 value),
  // though the race in create() itself is still theoretically possible on a
  // future concurrent create before the next reorder. Logged as CLOSED (in
  // practice, via T07) in scaffold/memory/DECISIONS.md, "cafe-menu-management
  // T07".
  async create(request: cafe.CreateMenuCategoryRequest): Promise<MenuCategory> {
    const sortOrder = await this.categoriesRepository.count();
    const category = this.categoriesRepository.create({ name: request.name, sortOrder });
    return this.categoriesRepository.save(category);
  }

  // T07 — AC6: persists the full category display order in one call.
  // orderedCategoryIds is the entire ordered list of ids (not {id, sortOrder}
  // pairs — see reorderMenuCategoriesRequestSchema's comment in
  // shared/contracts/src/cafe/menu.ts for why), so sortOrder = the id's index
  // in that array.
  //
  // Validation (judgment call, not pinned by any AC/VC/wireframe — logged in
  // scaffold/memory/DECISIONS.md, "cafe-menu-management T07"): rejects the
  // whole request with a 400 unless orderedCategoryIds is an exact match for
  // the current set of category ids — same size, no unknown/missing id, no
  // duplicate. Chosen over a partial/best-effort reorder because this method
  // rewrites every row's sortOrder wholesale; silently accepting a mismatched
  // set could leave some category's sortOrder stale (never rewritten) or
  // collide with another's (a duplicate id in the request would assign one
  // category two different sortOrder values, only the last write winning).
  //
  // Wrapped in a DB transaction (also logged there) so a mid-write failure
  // (e.g. the process crashing between the 3rd and 4th row) can't leave
  // sortOrder partially rewritten — every row's new sortOrder commits
  // together or not at all. Rewrites are sequenced with a plain for-loop
  // inside the transaction, not Promise.all, since a transaction's
  // EntityManager is bound to a single DB connection and can't run queries
  // concurrently on it.
  async reorderCategories(orderedCategoryIds: string[]): Promise<MenuCategory[]> {
    const existing = await this.categoriesRepository.find();
    const existingIds = new Set(existing.map((category) => category.id));
    const requestedIds = new Set(orderedCategoryIds);

    const isExactMatch =
      requestedIds.size === orderedCategoryIds.length &&
      requestedIds.size === existingIds.size &&
      [...requestedIds].every((id) => existingIds.has(id));
    if (!isExactMatch) {
      throw new BadRequestException(cafe.MENU_CATEGORY_REORDER_IDS_MISMATCH_MESSAGE);
    }

    return this.categoriesRepository.manager.transaction(async (manager) => {
      for (const [index, id] of orderedCategoryIds.entries()) {
        await manager.update(MenuCategory, { id }, { sortOrder: index });
      }
      return manager.find(MenuCategory, { order: { sortOrder: 'ASC' } });
    });
  }
}
