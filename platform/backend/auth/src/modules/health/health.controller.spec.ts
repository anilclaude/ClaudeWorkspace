import { Test, type TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { healthLiveSchema } from '@app/contracts';
import { HealthController } from './health.controller';

// Scaffold smoke test — makes `pnpm test` a real gate on an empty service
// rather than a no-op. Dependencies are mocked: this must not need Postgres.
describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn() } },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck: jest.fn() } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports liveness without touching the database', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  // Asserts against the shared contract, not a local literal — if the contract
  // changes, this fails here rather than in a consumer at runtime.
  it('returns a payload matching the published health contract', () => {
    expect(healthLiveSchema.safeParse(controller.live()).success).toBe(true);
  });
});
