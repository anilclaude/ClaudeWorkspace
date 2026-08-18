import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuCategoryController } from './menu-category.controller';
import { MenuCategoryService } from './menu-category.service';
import { MenuItemController } from './menu-item.controller';
import { MenuItemService } from './menu-item.service';

// T03 registered the category slice only; T04 adds the item create slice to
// this same module rather than a separate one (PRD §5: "backend/cafe/
// src/modules/menu/ — controller, service, entities", singular module).
// MenuItem is registered alongside MenuCategory since MenuItemService needs
// both repositories (item writes, category existence checks for AC5).
@Module({
  imports: [TypeOrmModule.forFeature([MenuCategory, MenuItem])],
  controllers: [MenuCategoryController, MenuItemController],
  providers: [MenuCategoryService, MenuItemService],
})
export class MenuModule {}
