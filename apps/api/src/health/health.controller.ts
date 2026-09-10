import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';


import { Public } from '../common/decorators';
import { ApiEnvelopeError, ApiEnvelopeOk } from '../common/openapi/decorators';
import { PrismaService } from '../database/prisma.service';

import type { ApiSuccess } from '@khabir/shared-types';

/**
 * Health endpoints. Both are public.
 *
 * GET /health   — liveness. Returns 200 as long as the process is running.
 *                 Process-only by design; it must NOT depend on the database.
 * GET /ready    — readiness. Verifies required dependencies (database)
 *                 and returns 200 only when the API can serve requests.
 *                 Returns 503 with a standard error envelope otherwise.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  @ApiEnvelopeOk('HealthDto', 200, 'Liveness probe (process-level only).')
  health(): ApiSuccess<{ status: 'ok'; service: 'api' }> {
    return { data: { status: 'ok', service: 'api' } };
  }

  @Public()
  @Get('ready')
  @ApiEnvelopeOk('ReadyDto', 200, 'Readiness probe (dependencies verified).')
  @ApiEnvelopeError(503, 'A required dependency is unavailable (canonical error envelope).')
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
