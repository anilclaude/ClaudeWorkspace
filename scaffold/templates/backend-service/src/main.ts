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
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  console.log(`__SERVICE_NAME__-service listening on :${env.PORT}`);
}

void bootstrap();
