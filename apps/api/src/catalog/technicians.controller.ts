/**
 * Technician discovery read endpoints (Task 10E).
 * Public per docs/07_API.md §6. Filters: q, appliance_category_id,
 * service_id, fault_id, rating_min, availability, sort (=rating only),
 * pagination. Geo params are documented but not implemented (DATABASE
 * MODEL GAP — reported to the CTO).
 */

import { technicianListQuerySchema, type TechnicianListQuery } from '@khabir/shared-validation';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';


import { Public } from '../common/decorators';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { TechniciansService } from './technicians.service';

import type { ApiSuccess, ApiMeta, TechnicianPublicDto } from '@khabir/shared-types';

@ApiTags('catalog')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@Public()
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Get()
  @ApiZodQuery(technicianListQuerySchema)
  @ApiEnvelopeOk('TechnicianPublicDto', 200, 'Verified technicians (paginated discovery list).')
  async list(
    @Query(new ZodValidationPipe(technicianListQuerySchema)) query: TechnicianListQuery,
  ): Promise<ApiSuccess<TechnicianPublicDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.technicians.list(query);
    return { data: items, meta };
  }

  @Get(':id')
  @ApiEnvelopeOk('TechnicianPublicDto', 200, 'Public technician profile.')
  @ApiEnvelopeError(404, 'Technician not found or not publicly visible (canonical error envelope).')
  async detail(@Param('id') id: string): Promise<ApiSuccess<TechnicianPublicDto>> {
    return { data: await this.technicians.detail(id) };
  }
}
