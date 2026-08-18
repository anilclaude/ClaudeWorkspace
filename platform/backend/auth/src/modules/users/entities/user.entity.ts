import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { auth } from '@app/contracts';

/**
 * User — login PRD (`docs/prd/_ACTIVE/login.md`) §4. The row the credential
 * check (AC1 success / AC2 uniform failure) reads. `passwordHash` never
 * leaves this service — see `shared/contracts/src/auth/index.ts`'s
 * `loginUserSchema`, which omits it by construction (CLAUDE.md #B5).
 *
 * Case-insensitive email uniqueness is enforced by a functional unique index
 * on `LOWER(email)`, created directly in the migration rather than declared
 * here via `@Index`/`unique: true`: TypeORM's decorators only describe a
 * plain-column index, which would enforce exact-case uniqueness and let
 * "a@x.com" / "A@x.com" collide as two different rows — a duplicate-account
 * bug. The column itself stores whatever casing was written (accounts are
 * created out of band by an administrator; this PRD has no self-service
 * registration path to normalize casing at write time), and every lookup
 * must compare case-insensitively to match what the index enforces.
 *
 * `role` — added by cafe-access-roles T00. Nullable, no default: no seed data
 * exists anywhere in this repo, and a pre-existing hand-created account with
 * no role assigned yet must fall into the exact same "unrecognized role"
 * rejection branch a future guard (cafe-access-roles T02) uses for any other
 * invalid role value — not a guessed default. Typed against
 * `shared/contracts`' `CafeRole`, not a locally-declared union, so the set of
 * valid values can never drift between this entity and whatever
 * (`backend/cafe`) reads the claim this column ends up on. Assigning an
 * actual role to an account is a `backend/auth` concern out of scope for this
 * task (no admin UI/endpoint is added here).
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'role', type: 'varchar', length: 32, nullable: true })
  role!: auth.CafeRole | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
