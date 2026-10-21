/**
 * Location endpoints (Task REM-001). Source: docs/07_API.md §8.
 * Authenticated, owner-scoped location records used by the service-request
 * flow. Identity always comes from the verified JWT — never the payload.
 *
 *   GET   /locations        customer | merchant (own locations, paginated)
 *   POST  /locations        customer | merchant (create owned location)
 *   PATCH /locations/:id    owner only (partial update)
 *
 * No DELETE: deletion semantics are not documented (docs/07 §8).
 */

import {
  createLocationSchema,
  paginationSchema,
  updateLocationSchema,
  type CreateLocationInput,
  type UpdateLocationInput,
} from '@khabir/shared-validation';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { LocationsService } from './locations.service';

import type { ApiMeta, ApiSuccess, LocationDto } from '@khabir/shared-types';

@ApiTags('locations')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or role mismatch.')
@UseGuards(JwtAuthGuard)
@Roles('customer', 'merchant')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('LocationDto', 200, 'Own locations (paginated, oldest first).')
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<LocationDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.locations.list(user.id, query);
    return { data: items, meta };
  }

  @Post()
  @HttpCode(201)
  @ApiZodBody(createLocationSchema)
  @ApiEnvelopeOk('LocationDto', 201, 'Location created and owned by the current account.')
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createLocationSchema)) body: CreateLocationInput,
  ): Promise<ApiSuccess<LocationDto>> {
    return { data: await this.locations.create(user.id, body) };
  }

  @Patch(':id')
  @ApiZodBody(updateLocationSchema)
  @ApiEnvelopeOk('LocationDto', 200, 'Location updated (owner only).')
  @ApiEnvelopeError(404, 'Location not found or not owned by this account.')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLocationSchema)) body: UpdateLocationInput,
  ): Promise<ApiSuccess<LocationDto>> {
    return { data: await this.locations.update(user.id, id, body) };
  }
}
