import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * MenuCategory — cafe-menu-management PRD (`docs/prd/_ACTIVE/cafe-menu-management.md`)
 * §7 `menu_categories` table. Shape matches `shared/contracts/src/cafe/menu.ts`'s
 * `menuCategorySchema` exactly (id/name/sortOrder) — no created/updated timestamp
 * columns, since the PRD's table definition doesn't list any for this entity
 * (matching the table exactly rather than speculatively adding columns, per B1).
 *
 * `sortOrder` — AC6: categories can be reordered. Server-assigned on create
 * (appended to the end, per the contract's `createMenuCategoryRequestSchema`
 * comment) and rewritten wholesale by T07's reorder endpoint. No unique
 * constraint on it: two categories briefly sharing a position mid-reorder
 * (before the full reorder request completes) is not a state this schema
 * needs to reject.
 */
@Entity({ name: 'menu_categories' })
export class MenuCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;
}
