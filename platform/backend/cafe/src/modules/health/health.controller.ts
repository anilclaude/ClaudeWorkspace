import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';
import type { HealthLive } from '@app/contracts';
import { Public } from '../../common/guards';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  // Liveness — is the process up? Deliberately does NOT touch the database:
  // an orchestrator restarting the container because Postgres blipped is worse
  // than leaving it running. @Public() — liveness/readiness checks predate
  // auth and are intentionally unauthenticated, not an oversight; also gives
  // T03's build-time role-policy check (AC5) a real endpoint with zero
  // unguarded methods to prove itself against.
  @Get('live')
  @Public()
  live(): HealthLive {
    return { status: 'ok' };
  }

  // Readiness — up AND able to serve. Pings this service's own database.
  // @Public() for the same reason as live() above.
  @Get()
  @HealthCheck()
  @Public()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
