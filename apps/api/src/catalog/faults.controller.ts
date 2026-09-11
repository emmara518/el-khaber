/**
 * Fault Guide read endpoints (Task 10E).
 * Public per docs/07_API.md §6. Filters: appliance_category_id, q.
 * List responses are paginated (page/limit, server max 100) with the
 * standard meta (total, totalPages, hasNext).
 */

import { faultListQuerySchema, type FaultListQuery } from '@khabir/shared-validation';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';


import { Public } from '../common/decorators';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { FaultsService } from './faults.service';

import type { ApiSuccess, ApiMeta, FaultDto, FaultSummaryDto } from '@khabir/shared-types';

@ApiTags('catalog')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@Public()
@Controller('faults')
export class FaultsController {
  constructor(private readonly faults: FaultsService) {}

  @Get()
  @ApiZodQuery(faultListQuerySchema)
  @ApiEnvelopeOk('FaultSummaryDto', 200, 'Published fault-guide summaries (paginated).')
  async list(
    @Query(new ZodValidationPipe(faultListQuerySchema)) query: FaultListQuery,
  ): Promise<ApiSuccess<FaultSummaryDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.faults.list(query);
    return { data: items, meta };
  }

  @Get(':id')
  @ApiEnvelopeOk('FaultDto', 200, 'Published fault-guide content.')
  @ApiEnvelopeError(404, 'Fault not found or not published (canonical error envelope).')
  async detail(@Param('id') id: string): Promise<ApiSuccess<FaultDto>> {
    return { data: await this.faults.detail(id) };
  }
}
