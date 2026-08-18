import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from '@app/nest-kit';
// Imported before AppModule so env validation runs (and can exit) before Nest
// starts wiring modules.
import { env } from './config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  // The browser calls this service directly — no BFF layer sits in front of
  // it — so CORS must explicitly allow the frontend's origin. credentials:
  // true is what lets an auth cookie/header actually reach this service from
  // the browser; it's meaningless (and risky) paired with a wildcard origin,
  // which is why CORS_ORIGIN is never allowed to default to '*'.
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true });
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  console.log(`cafe-service listening on :${env.PORT}`);
}

void bootstrap();
