import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { cafe } from '@app/contracts';
import { RequireRoles, RolesGuard } from '../../common/guards';
import { MenuItemService } from './menu-item.service';
import { MenuItem } from './entities/menu-item.entity';

// T04 (create) + T05 (admin list, available-items list) + T06 (PATCH
// availability toggle / partial update). Mirrors MenuCategoryController's
// shape exactly: @UseGuards(RolesGuard) at the class level,
// @RequireRoles('Admin') per route. Admin-only on all four routes for the
// same reasoning already logged for T03 (scaffold/memory/DECISIONS.md,
// "cafe-menu-management T03"), re-checked for T05's two GET routes
// specifically and logged again ("cafe-menu-management T05"), and again for
// T06's PATCH route per VC-004 ("cafe-menu-management (planning) — VC-004
// 'removing' interpretation" reads this endpoint as VC-004's Admin-only
// add/edit/remove requirement): every wireframed screen in this PRD is an
// internal admin screen, and no task in this ledger (nor PRD §6, which
// explicitly defers Order Management to its own future PRD/planning pass)
// reads or writes items from a non-admin flow yet.
//
// Paths match CAFE_ROUTES.items ('/menu/items'), CAFE_ROUTES.availableItems
// ('/menu/items/available'), and `${CAFE_ROUTES.items}/:id` (T06 — no
// dedicated named route constant, following ordinary Nest route-param
// convention per this task's own instructions) from
// shared/contracts/src/cafe/menu.ts — asserted directly in
// menu-item.controller.spec.ts so paths can't silently drift apart.
@Controller('menu/items')
@UseGuards(RolesGuard)
export class MenuItemController {
  constructor(private readonly itemService: MenuItemService) {}

  // T05 — admin view: every item, regardless of availability (AC3 requires
  // an unavailable item to stay visible here). Ordering is
  // MenuItemService.findAll()'s own concern (category order, then
  // creation order within category) — see that method's comment.
  @Get()
  @RequireRoles('Admin')
  async list(): Promise<cafe.MenuItemListResponse> {
    const items = await this.itemService.findAll();
    return { success: true, data: items.map((item) => this.toResponse(item)), error: null };
  }

  // T05 — available-items query method (VC-003): same shape, filtered to
  // isAvailable items only, same ordering as list() above.
  @Get('available')
  @RequireRoles('Admin')
  async listAvailable(): Promise<cafe.MenuItemListResponse> {
    const items = await this.itemService.findAvailable();
    return { success: true, data: items.map((item) => this.toResponse(item)), error: null };
  }

  // 201 Created — same convention T03's category create() used; no AC/VC
  // pins a specific status code here.
  @Post()
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<cafe.MenuItemResponse> {
    const parsed = cafe.createMenuItemRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid menu item request';
      throw new BadRequestException(message);
    }

    const item = await this.itemService.create(parsed.data);
    return { success: true, data: this.toResponse(item), error: null };
  }

  // T06 — AC3/AC4: partial update, primarily the isAvailable toggle
  // (`{ isAvailable: false }` to mark unavailable, `{ isAvailable: true }`
  // to mark available again — the same handler both directions, per this
  // task's own "genuinely inseparable" ledger note). Also accepts any other
  // updateMenuItemRequestSchema field (T11's fuller edit-form PATCH), all
  // re-validated the same way create()'s body is. A PATCH against an id that
  // doesn't reference an existing item propagates MenuItemService.update()'s
  // NotFoundException unchanged — 404, a defensible default not pinned by
  // any AC/VC (scaffold/memory/DECISIONS.md, "cafe-menu-management T06").
  //
  // Review cycle 1 SHOULD-FIX: `id` is a Postgres `uuid` column
  // (itemsRepository.findOneBy({ id })), and a malformed id was reaching
  // that query uncaught, surfacing as a raw 500 (`invalid input syntax for
  // type uuid`) instead of a clean 4xx. `ParseUUIDPipe` is the standard
  // NestJS answer — first `:id`-param route in the codebase, so no existing
  // precedent to follow (checked, none found). Runs before the body even
  // reaches updateMenuItemRequestSchema, so a malformed id now 400s without
  // ever touching the service/DB. Wiring + rejection behavior both proven in
  // menu-item.controller.spec.ts.
  @Patch(':id')
  @RequireRoles('Admin')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<cafe.MenuItemResponse> {
    const parsed = cafe.updateMenuItemRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid menu item request';
      throw new BadRequestException(message);
    }

    const item = await this.itemService.update(id, parsed.data);
    return { success: true, data: this.toResponse(item), error: null };
  }

  // Explicit mapping, not a spread: MenuItem's createdAt/updatedAt are
  // `Date` on the entity but `string` (ISO) on menuItemSchema — the same
  // Date/string boundary MenuCategoryController never had to cross (no
  // date fields on MenuCategory). NestJS's own JSON serialization would
  // produce the same ISO string over the wire either way (JSON.stringify
  // calls Date#toJSON), but spreading the raw entity here would silently
  // mistype cafe.MenuItemResponse's `data` at the TypeScript level. Shared
  // by create()/list()/listAvailable() (T05 factors this out of T04's
  // create()-only version, no behavior change — same field-for-field
  // mapping, now reused across all three routes instead of duplicated).
  private toResponse(item: MenuItem): cafe.MenuItem {
    return {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
