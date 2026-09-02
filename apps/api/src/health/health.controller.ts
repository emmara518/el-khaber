import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';


import { Public } from '../common/decorators';
import { type PrismaService } from '../database/prisma.service';

import type { ApiSuccess } from '@khabir/shared-types';

/**
 * Health endpoints. Both are public.
 *
 * GET /health   — liveness. Returns 200 as long as the process is running.
 * GET /ready    — readiness. Verifies required dependencies (database)
 *                 and returns 200 only when the API can serve requests.
 *                 Returns 503 with a standard error envelope otherwise.
 */
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  health(): ApiSuccess<{ status: 'ok'; service: 'api' }> {
    return { data: { status: 'ok', service: 'api' } };
  }

  @Public()
  @Get('ready')
  async ready(): Promise<ApiSuccess<{ status: 'ready'; checks: { database: 'ok' } }>> {
    if (!this.prisma.isConnected()) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        // Connection is now healthy.
      } catch (err) {
        const message = err instanceof Error ? err.message : 'database unreachable';
        throw new HttpException(
          {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Service not ready',
              fields: { database: message },
            },
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }
    return { data: { status: 'ready', checks: { database: 'ok' } } };
  }
}
