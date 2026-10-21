import { Controller, Get, HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { Public } from '../common/decorators';
import { StructuredLogger } from '../common/structured-logger';
import { PrismaService } from '../database/prisma.service';

interface LivenessResponse {
  status: 'ok';
  service: string;
}

interface ReadinessResponse {
  status: 'ready';
  checks: {
    database: 'ok';
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new StructuredLogger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  liveness(): LivenessResponse {
    return { status: 'ok', service: 'api' };
  }

  async readiness(): Promise<ReadinessResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', checks: { database: 'ok' } };
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'database unreachable';
      this.logger.error('readiness check failed', {
        event: 'health.readiness.failed',
        durationMs: 0,
        detail,
      });
      throw new HttpException({ message: 'Service not ready' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}

@Public()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  live(): { data: LivenessResponse } {
    return { data: this.healthService.liveness() };
  }

  @Get('health/live')
  liveAlias(): { data: LivenessResponse } {
    return { data: this.healthService.liveness() };
  }

  @Get('ready')
  ready(): Promise<{ data: ReadinessResponse }> {
    return this.healthService.readiness().then((result) => ({ data: result }));
  }
}
