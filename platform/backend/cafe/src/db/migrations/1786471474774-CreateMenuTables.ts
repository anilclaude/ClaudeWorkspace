import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * cafe-menu-management T02 — creates `menu_categories` and `menu_items`
 * (PRD §7). First entities/migration in `backend/cafe`; this is also why
 * `backend/cafe`'s integration-test harness (`src/test/`) is added in this
 * same task rather than a prior one (`cafe-access-roles` T01 deliberately
 * deferred it — see scaffold/memory/DECISIONS.md, "cafe-access-roles T01" —
 * with zero entities to prove a migration against at the time).
 *
 * `gen_random_uuid()` — same Postgres 13+ built-in `users`' migration
 * already uses, no extension required.
 *
 * `menu_items.category_id` FK — `ON DELETE RESTRICT`: no task in this
 * ledger adds a "delete category" endpoint, so this is unexercised today,
 * but RESTRICT is the one behavior that can't silently violate AC5 ("every
 * item belongs to exactly one category") if that endpoint is ever added —
 * CASCADE would delete live menu items out from under a category delete,
 * SET NULL isn't legal against a NOT NULL column. Neither the contract nor
 * PRD §7 pins this; logged in scaffold/memory/DECISIONS.md
 * ("cafe-menu-management T02").
 *
 * `menu_items.price` — numeric(10,2) per PRD §7, no DB-level CHECK for
 * "> 0" (VC-001/AC2 stay an application-layer/Zod concern), matching the
 * precedent `AddRoleToUsers`'s migration already documented for `role`.
 */
export class CreateMenuTables1786471474774 implements MigrationInterface {
  name = 'CreateMenuTables1786471474774';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "menu_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "sort_order" integer NOT NULL,
        CONSTRAINT "PK_menu_categories_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "menu_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text NULL,
        "price" numeric(10,2) NOT NULL,
        "is_available" boolean NOT NULL DEFAULT true,
        "image_url" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_menu_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_menu_items_category_id" FOREIGN KEY ("category_id")
          REFERENCES "menu_categories" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "menu_items"`);
    await queryRunner.query(`DROP TABLE "menu_categories"`);
  }
}
