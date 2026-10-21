/**
 * Merchant product catalog endpoints (Task 10G).
 * Source: docs/07_API.md §17. Merchant-only; ownership resolved from the JWT.
 */

import {
  merchantProductCreateSchema,
  merchantProductUpdateSchema,
  paginationSchema,
  type MerchantProductCreateInput,
  type MerchantProductUpdateInput,
} from '@khabir/shared-validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { NotFoundException } from '../common/errors';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { MerchantProductsService } from './products.service';

import type { ApiMeta, ApiSuccess, MerchantProductDto } from '@khabir/shared-types';

@ApiTags('merchant')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or non-merchant role.')
@UseGuards(JwtAuthGuard)
@Roles('merchant')
@Controller('merchant/products')
export class MerchantProductsController {
  constructor(private readonly products: MerchantProductsService) {}

  @Get()
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('MerchantProductDto', 200, 'Own products (paginated; newest first).')
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<MerchantProductDto[]> & { meta: ApiMeta }> {
    const merchantId = await this.products.resolveMerchantProfileId(user.id);
    if (merchantId === null) {
      return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0, hasNext: false } };
    }
    const { items, meta } = await this.products.list(merchantId, query);
    return { data: items, meta };
  }

  @Post()
  @HttpCode(201)
  @ApiZodBody(merchantProductCreateSchema)
  @ApiEnvelopeOk('MerchantProductDto', 201, 'Product created and owned by the authenticated merchant.')
  @ApiEnvelopeError(404, 'Merchant profile not found (onboarding required).')
  @ApiEnvelopeError(409, 'Slug already in use (canonical error envelope).')
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(merchantProductCreateSchema)) body: MerchantProductCreateInput,
  ): Promise<ApiSuccess<MerchantProductDto>> {
    const merchantId = await this.products.resolveMerchantProfileId(user.id);
    if (merchantId === null) {
      throw new NotFoundException('Merchant profile not found');
    }
    return { data: await this.products.create(merchantId, body) };
  }

  @Get(':id')
  @ApiEnvelopeOk('MerchantProductDto', 200, 'Own product detail.')
  @ApiEnvelopeError(404, 'Product not found or owned by another merchant (identical response).')
  async detail(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<MerchantProductDto>> {
    const merchantId = await this.products.resolveMerchantProfileId(user.id);
    if (merchantId === null) {
      throw new NotFoundException('Product not found');
    }
    return { data: await this.products.detail(merchantId, id) };
  }

  @Patch(':id')
  @ApiZodBody(merchantProductUpdateSchema)
  @ApiEnvelopeOk('MerchantProductDto', 200, 'Product updated (whitelist fields only).')
  @ApiEnvelopeError(404, 'Product not found or owned by another merchant.')
  @ApiEnvelopeError(409, 'Slug already in use (canonical error envelope).')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(merchantProductUpdateSchema)) body: MerchantProductUpdateInput,
  ): Promise<ApiSuccess<MerchantProductDto>> {
    const merchantId = await this.products.resolveMerchantProfileId(user.id);
    if (merchantId === null) {
      throw new NotFoundException('Product not found');
    }
    return { data: await this.products.update(merchantId, id, body) };
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiEnvelopeError(404, 'Product not found or owned by another merchant (canonical envelope).')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    const merchantId = await this.products.resolveMerchantProfileId(user.id);
    if (merchantId === null) {
      throw new NotFoundException('Product not found');
    }
    await this.products.remove(merchantId, id);
  }
}
