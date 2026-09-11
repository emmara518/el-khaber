/**
 * Service/specialty catalog read endpoint (Task 10E).
 * Public per docs/07_API.md §6. Filters: appliance_category_id, q.
 */

import { serviceListQuerySchema, type ServiceListQuery } from '@khabir/shared-validation';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';


import { Public } from '../common/decorators';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { ServiceCatalogService } from './service-catalog.service';

import type { ApiSuccess, ApiMeta, ServiceDto } from '@khabir/shared-types';

@ApiTags('catalog')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@Public()
@Controller('services')
export class ServiceCatalogController {
  constructor(private readonly services: ServiceCatalogService) {}

  @Get()
  @ApiZodQuery(serviceListQuerySchema)
  @ApiEnvelopeOk('ServiceDto', 200, 'Active service/specialty catalog entries (paginated).')
  async list(
    @Query(new ZodValidationPipe(serviceListQuerySchema)) query: ServiceListQuery,
  ): Promise<ApiSuccess<ServiceDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.services.list(query);
    return { data: items, meta };
  }
}
