import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { cafe } from '@app/contracts';
import { RequireRoles, RolesGuard } from '../../common/guards';
import { MenuCategoryService } from './menu-category.service';

// T03 — the first controller in backend/cafe to actually need
// @UseGuards(RolesGuard): every other controller so far (HealthController)
// only ever declares @Public(). Both endpoints are Admin-only — see
// scaffold/memory/DECISIONS.md ("cafe-menu-management T03") for why: every
// wireframed screen in this PRD (cafe-menu-management/index.md) is an
// internal admin screen ("Desktop-first ... not customer-facing"), the task
// title itself is "Menu category read/create endpoints (Admin)", and no
// currently-planned consumer in this PRD reads categories from a
// non-admin flow — a future ordering/kitchen screen (a later café PRD) would
// need its own read endpoint scoped by that PRD's own planning, not this one.
//
// Path matches CAFE_ROUTES.categories ('/menu/categories') from
// shared/contracts/src/cafe/menu.ts — asserted directly in
// menu-category.controller.spec.ts so the two can't silently drift apart.
@Controller('menu/categories')
@UseGuards(RolesGuard)
export class MenuCategoryController {
  constructor(private readonly categoryService: MenuCategoryService) {}

  @Get()
  @RequireRoles('Admin')
  async list(): Promise<cafe.MenuCategoryListResponse> {
    const categories = await this.categoryService.findAll();
    return { success: true, data: categories, error: null };
  }

  // 201 Created — standard REST convention for a successful resource
  // creation; no AC/VC pins a specific status code for this endpoint (unlike
  // auth's login, where AC2's uniform-response requirement forces a shared
  // 200 across both branches — no such constraint applies here).
  @Post()
  @RequireRoles('Admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<cafe.MenuCategoryResponse> {
    const parsed = cafe.createMenuCategoryRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid category request';
      throw new BadRequestException(message);
    }

    const category = await this.categoryService.create(parsed.data);
    return { success: true, data: category, error: null };
  }

  // T07 — AC6: categories can be reordered. Path matches
  // CAFE_ROUTES.reorderCategories ('/menu/categories/reorder') — asserted
  // directly in menu-category.controller.spec.ts. 200 OK (default, no
  // @HttpCode override), not 201 — unlike create() above, this doesn't
  // create a resource, it rewrites sortOrder on existing rows; a judgment
  // call, logged in scaffold/memory/DECISIONS.md ("cafe-menu-management
  // T07"). MenuCategoryService.reorderCategories() rejects any mismatch
  // between orderedCategoryIds and the current set of category ids
  // (missing/unknown/duplicate id) with a 400 before writing anything — see
  // that method's own comment for the reasoning.
  @Post('reorder')
  @RequireRoles('Admin')
  async reorder(@Body() body: unknown): Promise<cafe.MenuCategoryListResponse> {
    const parsed = cafe.reorderMenuCategoriesRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid reorder request';
      throw new BadRequestException(message);
    }

    const categories = await this.categoryService.reorderCategories(parsed.data.orderedCategoryIds);
    return { success: true, data: categories, error: null };
  }
}
