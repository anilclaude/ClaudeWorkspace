import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Login PRD §4 — creates the `users` table the credential check (AC1/AC2)
 * reads.
 *
 * `email` uniqueness is enforced case-insensitively via a functional unique
 * index on `LOWER(email)`, not a plain `UNIQUE(email)` constraint: accounts
 * are created by an administrator, out of band, with no self-service
 * registration in this PRD to normalize casing on the way in, so the
 * database is the one place guaranteed to see every insert regardless of how
 * it was cased. A plain unique constraint on the raw column would let
 * "a@x.com" and "A@x.com" collide as two separate rows — a duplicate-account
 * bug — and would silently defeat AC2's uniform "Email or password is
 * incorrect" message, which depends on a lookup that can find the one row
 * regardless of casing.
 *
 * `gen_random_uuid()` is a Postgres 13+ built-in (no extension required) —
 * matches the UUID `id` type already pinned for the login contract in
 * `shared/contracts/src/auth/index.ts` (see DECISIONS.md, T01).
 */
export class CreateUsersTable1786272863265 implements MigrationInterface {
  name = 'CreateUsersTable1786272863265';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" (LOWER("email"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "users_email_lower_idx"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
