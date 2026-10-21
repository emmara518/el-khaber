/**
 * Service Request lifecycle endpoints (Task 10F).
 * Source: docs/07_API.md §7. All routes are authenticated; role scoping
 * happens server-side (@Roles + JWT identity — never client claims).
 *
 *   POST   /service-requests            customer
 *   GET    /service-requests            customer | technician (role-scoped)
 *   GET    /service-requests/:id        participants (owner / targeted+assigned)
 *   POST   /service-requests/:id/accept    technician (pending)
 *   POST   /service-requests/:id/reject    technician (pending/accepted)
 *   POST   /service-requests/:id/start     technician (accepted → on_the_way → in_progress)
 *   POST   /service-requests/:id/complete  technician (in_progress)
 *   POST   /service-requests/:id/cancel    customer owner (pending/accepted)
 *
 * POST /confirm is NOT implemented: the documented confirm endpoint is
 * conditional ("when a confirmation state is required") and the canonical
 * state chain contains no confirmation state.
 */

import {
  createServiceRequestSchema,
  serviceRequestListQuerySchema,
  type CreateServiceRequestInput,
  type ServiceRequestListQuery,
} from '@khabir/shared-validation';
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { ServiceRequestsService } from './service-requests.service';

import type { ApiMeta, ApiSuccess, ServiceRequestDto, ServiceRequestSummaryDto } from '@khabir/shared-types';

@ApiTags('service-requests')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing, malformed, or expired access token / role mismatch.')
@UseGuards(JwtAuthGuard)
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly serviceRequests: ServiceRequestsService) {}

  @Post()
  @HttpCode(201)
  @Roles('customer')
  @ApiZodBody(createServiceRequestSchema)
  @ApiEnvelopeOk('ServiceRequestDto', 201, 'Request created with status=pending (history recorded).')
  @ApiEnvelopeError(404, 'Referenced technician/location/category/service/fault not found or not owned.')
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createServiceRequestSchema)) body: CreateServiceRequestInput,
  ): Promise<ApiSuccess<ServiceRequestDto>> {
    return { data: await this.serviceRequests.create(user.id, body) };
  }

  @Get()
  @ApiZodQuery(serviceRequestListQuerySchema)
  @ApiEnvelopeOk('ServiceRequestSummaryDto', 200, 'Role-scoped request list (paginated).')
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(serviceRequestListQuerySchema)) query: ServiceRequestListQuery,
  ): Promise<ApiSuccess<ServiceRequestSummaryDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.serviceRequests.list(
      { id: user.id, role: user.role },
      query,
    );
    return { data: items, meta };
  }

  @Get(':id')
  @ApiEnvelopeOk('ServiceRequestDto', 200, 'Role-scoped request detail with bounded history.')
  @ApiEnvelopeError(404, 'Request not found or not visible to this account.')
  async detail(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<ServiceRequestDto>> {
    return { data: await this.serviceRequests.detail({ id: user.id, role: user.role }, id) };
  }

  @Post(':id/accept')
  @HttpCode(200)
  @Roles('technician')
  @ApiEnvelopeOk('ServiceRequestDto', 200, 'Request accepted (pending → accepted).')
  @ApiEnvelopeError(409, 'Stale state / already accepted (canonical envelope).')
  @ApiEnvelopeError(404, 'Request not found or not targeted at this technician.')
  async accept(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<ServiceRequestDto>> {
    return { data: await this.serviceRequests.accept({ id: user.id, role: user.role }, id) };
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Roles('technician')
  @ApiEnvelopeOk('ServiceRequestDto', 200, 'Request rejected (→ cancelled per documented semantics).')
  @ApiEnvelopeError(409, 'Stale state (canonical envelope).')
  @ApiEnvelopeError(404, 'Request not found or not targeted at this technician.')
  async reject(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<ServiceRequestDto>> {
    return { data: await this.serviceRequests.reject({ id: user.id, role: user.role }, id) };
  }

  @Post(':id/start')
  @HttpCode(200)
  @Roles('technician')
  @ApiEnvelopeOk('ServiceRequestDto', 200, 'Active-service stage advanced (accepted → on_the_way → in_progress).')
  @ApiEnvelopeError(409, 'Invalid state transition (canonical envelope).')
  @ApiEnvelopeError(404, 'Request not found or not assigned to this technician.')
  async start(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<ServiceRequestDto>> {
    return { data: await this.serviceRequests.start({ id: user.id, role: user.role }, id) };
  }

  @Post(':id/complete')
  @HttpCode(200)
  @Roles('technician')
  @ApiEnvelopeOk('ServiceRequestDto', 200, 'Request completed (in_progress → completed).')
  @ApiEnvelopeError(409, 'Invalid state transition (canonical envelope).')
  @ApiEnvelopeError(404, 'Request not found or not assigned to this technician.')
  async complete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<ServiceRequestDto>> {
    return { data: await this.serviceRequests.complete({ id: user.id, role: user.role }, id) };
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles('customer')
  @ApiEnvelopeOk('ServiceRequestDto', 200, 'Request cancelled (pending/accepted → cancelled, owner only).')
  @ApiEnvelopeError(409, 'Invalid state transition (canonical envelope).')
  @ApiEnvelopeError(404, 'Request not found or not owned by this customer.')
  async cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<ServiceRequestDto>> {
    return { data: await this.serviceRequests.cancel({ id: user.id, role: user.role }, id) };
  }
}
