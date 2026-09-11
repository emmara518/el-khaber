/**
 * Appliance category read endpoint (Task 10E).
 * Public per docs/07_API.md §6. The list is a bounded reference query
 * (active categories only) — no pagination parameters are documented.
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators';
import { ApiEnvelopeError, ApiEnvelopeOk } from '../common/openapi/decorators';

import { ApplianceCategoriesService } from './appliances.service';

import type { ApiSuccess, ApplianceCategoryDto } from '@khabir/shared-types';

@ApiTags('catalog')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@Public()
@Controller('appliance-categories')
export class ApplianceCategoriesController {
  constructor(private readonly appliances: ApplianceCategoriesService) {}

  @Get()
  @ApiEnvelopeOk('ApplianceCategoryDto', 200, 'Active appliance categories.')
  async list(): Promise<ApiSuccess<ApplianceCategoryDto[]>> {
    return { data: await this.appliances.listActive() };
  }
}
