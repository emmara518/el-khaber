import { Controller, Get, HttpStatus, Injectable } from '@nestjs/common';

import { StructuredLogger } from '../common/structured-logger';
import { PrismaService } from '../database/prisma.service';

interface HealthResponse {
  status: 'ok';
}

interface HealthErrorResponse {
  status: 'error';
  detail: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new StructuredLogger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  liveness(): HealthResponse {
    return { status: 'ok' };
  }

  async readiness(): Promise<HealthResponse | HealthErrorResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'database unreachable';
      this.logger.error('readiness check failed', {
        event: 'health.readiness.failed',
        durationMs: 0,
        detail,
      });
      return { status: 'error', detail: 'Service not ready' };
    }
  }
}

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live(): HealthResponse {
    return this.healthService.liveness();
  }

  @Get('ready')
  async ready(): Promise<HealthResponse> {
    const result = await this.healthService.readiness();
    if (result.status === 'error') {
      const err = Object.assign(new Error(result.detail), { status: HttpStatus.SERVICE_UNAVAILABLE });
      throw err;
    }
    return result;
  }
}
