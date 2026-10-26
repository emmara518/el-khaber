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
    migrations: 'ok';
    schema: 'ok';
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
      const [pendingRows, userRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ pending: number }>>`
          SELECT count(*)::int AS pending
          FROM "_prisma_migrations"
          WHERE finished_at IS NULL AND rolled_back_at IS NULL
        `,
        this.prisma.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM "users"
        `,
      ]);
      const pending = Number(pendingRows[0]?.pending ?? 0);
      if (pending !== 0) {
        throw new Error(`database has ${String(pending)} unfinished migration(s)`);
      }
      // The users query proves the runtime role can read a critical migrated
      // table, not merely open a TCP connection.
      void userRows;
      return {
        status: 'ready',
        checks: { database: 'ok', migrations: 'ok', schema: 'ok' },
      };
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
