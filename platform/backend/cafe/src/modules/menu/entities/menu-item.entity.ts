import { Column, CreateDateColumn, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, UpdateDateColumn, type ValueTransformer } from 'typeorm';
import { MenuCategory } from './menu-category.entity';

/**
 * T04 — closes the OPEN item T02 deliberately deferred (see this entity's
 * `price` doc comment below and scaffold/memory/DECISIONS.md,
 * "cafe-menu-management T02 (build)"): `pg` returns `numeric` columns as
 * strings, so without this, `MenuItem.price` read back from the database
 * (e.g. after `.save()`'s `RETURNING`, or any future `find`/`findOne`) would
 * be a string at runtime despite being typed `number`. Applied at the
 * column level (not ad hoc `Number(...)` in each service method) so every
 * current and future read path — T04's create today, T05's list, T06's
 * update — gets a real `number` for free, with one definition instead of
 * one per call site.
 */
const numericColumnTransformer: ValueTransformer = {
  // `price` is NOT NULL and T04's only write path (MenuItemService.create())
  // always supplies a number, so `to` never actually sees null/undefined
  // today — widened to match `from`'s signature anyway (reviewer NIT) ahead
  // of T06's partial-update PATCH, where an omitted/nullable price on a
  // future column could otherwise slip past this transformer's types
  // unnoticed.
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};

/**
 * MenuItem — cafe-menu-management PRD §7 `menu_items` table. Shape matches
 * `shared/contracts/src/cafe/menu.ts`'s `menuItemSchema` exactly.
 *
 * `categoryId` (AC5 — every item belongs to exactly one category) is a
 * required, non-nullable FK to `menu_categories.id`. `ON DELETE RESTRICT`
 * (set in the migration, not expressible via TypeORM's `@ManyToOne` options
 * used here for the relation metadata only) — no task in this ledger adds a
 * "delete category" endpoint, so this is unexercised today, but RESTRICT is
 * the default that can't silently violate AC5 (CASCADE would delete live
 * menu items out from under a category delete; SET NULL isn't legal against
 * a NOT NULL column and would also violate AC5). Neither the contract nor
 * PRD §7 pins this — logged in scaffold/memory/DECISIONS.md
 * ("cafe-menu-management T02").
 *
 * `price` — numeric(10,2), matching PRD §7 exactly. No DB-level CHECK
 * constraint for "> 0" (VC-001/AC2): validation lives at the application
 * layer (Zod, `createMenuItemRequestSchema`/`updateMenuItemRequestSchema`),
 * the same choice `user.entity.ts`'s migration already documented for
 * `role` ("no existing column in this table uses a DB-level enum/check
 * either") — followed here for consistency, not re-litigated.
 *
 * `price` is typed `number` here and now backed by `numericColumnTransformer`
 * (added in T04, closing the OPEN item T02 deliberately deferred — see the
 * comment above this class) so `numeric`'s string-by-default return from
 * `pg` is parsed back into a real `number` on every read, not just at
 * insert time.
 */
@Entity({ name: 'menu_items' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => MenuCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: MenuCategory;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'price', type: 'numeric', precision: 10, scale: 2, transformer: numericColumnTransformer })
  price!: number;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
