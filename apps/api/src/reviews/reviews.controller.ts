/**
 * Review endpoints (Task 10H). Source: docs/07_API.md §10 and §6.
 * PATCH /reviews/:id is intentionally NOT implemented: it is optional in
 * the contract ("only if editing is approved") and no edit policy has
 * been approved.
 */

import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  createReviewSchema,
  paginationSchema,
  type CreateReviewInput,
} from '@khabir/shared-validation';

import { CurrentUser, Public, Roles, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReviewsService } from './reviews.service';

import type { ApiMeta, ApiSuccess, ReviewSummaryDto } from '@khabir/shared-types';

@ApiTags('reviews')
@Public()
@Controller('technicians')
export class TechnicianReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Public discovery read (docs/07 §6): public fields only. */
  @Get(':id/reviews')
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('ReviewSummaryDto', 200, 'Public reviews for a verified technician (paginated).')
  @ApiEnvelopeError(404, 'Technician not found or not publicly visible.')
  async listForTechnician(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<ReviewSummaryDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.reviews.listForTechnician(id, query);
    return { data: items, meta };
  }
}

@ApiTags('reviews')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or non-customer role.')
@UseGuards(JwtAuthGuard)
@Roles('customer')
@Controller('service-requests')
export class ServiceRequestReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post(':id/review')
  @HttpCode(201)
  @ApiZodBody(createReviewSchema)
  @ApiEnvelopeOk('ReviewSummaryDto', 201, 'Review created (owner, completed request, one per request).')
  @ApiEnvelopeError(404, 'Request not found or not owned by this customer.')
  @ApiEnvelopeError(409, 'Review already exists / request not completed (canonical envelope).')
  async create(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createReviewSchema)) body: CreateReviewInput,
  ): Promise<ApiSuccess<ReviewSummaryDto>> {
    return { data: await this.reviews.create(user.id, id, body) };
  }
}
