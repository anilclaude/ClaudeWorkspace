import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';
import type { HealthLive } from '@app/contracts';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  // Liveness — is the process up? Deliberately does NOT touch the database:
  // an orchestrator restarting the container because Postgres blipped is worse
  // than leaving it running.
  @Get('live')
  live(): HealthLive {
    return { status: 'ok' };
  }

  // Readiness — up AND able to serve. Pings this service's own database.
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
