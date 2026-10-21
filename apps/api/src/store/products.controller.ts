/**
 * Public store product read endpoints (Phase D).
 *
 * Public (like `/technicians`, `/services`): any client may browse active
 * products. Customer/Technician store surfaces consume these — they must NOT
 * use the merchant JWT-scoped management endpoints (`/merchant/products`).
 *
 * Only ACTIVE products are exposed; suspended products are excluded and 404.
 */

import { paginationSchema } from '@khabir/shared-validation';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { StoreProductsService } from './products.service';

import type { ApiMeta, ApiSuccess, PublicProductDto } from '@khabir/shared-types';

@ApiTags('catalog')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@Public()
@Controller('products')
export class StoreProductsController {
  constructor(private readonly products: StoreProductsService) {}

  @Get()
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('PublicProductDto', 200, 'Active merchant products (paginated; newest first).')
  async list(
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<PublicProductDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.products.list(query);
    return { data: items, meta };
  }

  @Get(':id')
  @ApiEnvelopeOk('PublicProductDto', 200, 'Public product detail.')
  @ApiEnvelopeError(404, 'Product not found or not publicly visible (canonical error envelope).')
  async detail(@Param('id') id: string): Promise<ApiSuccess<PublicProductDto>> {
    return { data: await this.products.detail(id) };
  }
}
