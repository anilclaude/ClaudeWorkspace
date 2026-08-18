import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestIdMiddleware } from '@app/nest-kit';
import { env } from './config';
import { HealthModule } from './modules/health/health.module';
import { MenuModule } from './modules/menu/menu.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      database: env.POSTGRES_DB,
      username: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      autoLoadEntities: true,
      // Migrations only, never synchronize on boot. The database is shared
      // across every backend service — this connection only ever loads this
      // service's own entities (autoLoadEntities scans this codebase's
      // modules, not the whole database), so it can't see or touch another
      // service's tables even though they're in the same schema.
      synchronize: false,
      // Matches src/db/data-source.ts's migrationsTableName — the two must
      // stay in agreement so a future `migrationsRun: true` wouldn't read a
      // different history than `migration:run` writes.
      migrationsTableName: 'cafe_migrations',
      retryAttempts: 5,
      retryDelay: 3000,
    }),
    HealthModule,
    MenuModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
