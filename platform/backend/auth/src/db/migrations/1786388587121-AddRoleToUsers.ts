import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * cafe-access-roles T00 — adds a `role` column to `users` so a caller's
 * staff role can travel on the JWT `AuthService.login` signs, without
 * inventing a second table/mechanism inside `backend/cafe` (PRD §7: "no new
 * database tables... cafe_db never stores a copy of who's on staff"). See
 * scaffold/memory/DECISIONS.md, "cafe-access-roles T00 (planning
 * resolution)", 2026-08-11.
 *
 * Nullable, no default, no backfill `UPDATE`: no seed/demo data exists
 * anywhere in this repo, but accounts are created out-of-band by an
 * administrator (user.entity.ts's own documented pattern), so an environment
 * could already hold hand-created rows this migration must not silently
 * mis-assign a role to. `ADD COLUMN ... NULL` applies to existing rows
 * without needing a backfill statement — a NULL role is deliberately treated
 * identically to an unrecognized one by the future cafe-access-roles T02
 * guard's rejection branch (fail-closed), not a separate code path.
 *
 * Values are constrained to the five roles in
 * `shared/contracts/src/auth/index.ts`'s `cafeRoleSchema`
 * (Admin/Manager/Cashier/Waiter/Kitchen) — enforced at the application layer
 * (Zod, T02's guard) rather than a DB `CHECK` constraint, matching how this
 * service already validates everything else it writes (no existing column in
 * this table uses a DB-level enum/check either).
 */
export class AddRoleToUsers1786388587121 implements MigrationInterface {
  name = 'AddRoleToUsers1786388587121';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "role" varchar(32) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
