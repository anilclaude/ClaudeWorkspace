import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../config';

// Used by the TypeORM CLI only (migration:generate / migration:run / revert).
// The running app builds its own connection in app.module.ts — the two must
// stay in agreement, which is why both read the same validated `env`.
//
// synchronize is deliberately absent here as well as in app.module.ts: schema
// changes are reviewed, reversible migrations, never something the ORM applies
// on boot.
//
// Globs are __dirname-relative so the same file works under ts-node (CLI) and
// from dist/ (compiled).
//
// migrationsTableName is set explicitly and namespaced per service: the
// database is shared across every backend service (platform_db, one schema),
// so the default "migrations" table would be shared too — this service's
// migration:run would see, and could conflict with, another service's
// migration history. "core_migrations" keeps each service's history isolated
// even though the underlying database isn't.
export default new DataSource({
  type: 'postgres',
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DB,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  entities: [`${__dirname}/../modules/**/entities/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  migrationsTableName: 'core_migrations',
});
