/**
 * Technician self-service endpoints (Task 10J-R1). Sources:
 * docs/07_API.md §16. All routes technician-only; identity from JWT —
 * never from params/body.
 */

import {
  serviceRequestListQuerySchema,
  technicianProfileUpdateSchema,
  technicianServiceAddSchema,
  type ServiceRequestListQuery,
  type TechnicianProfileUpdateInput,
  type TechnicianServiceAddInput,
} from '@khabir/shared-validation';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles, CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { TechnicianSelfService } from './technician-self.service';

import type { ApiMeta, ApiSuccess } from '@khabir/shared-types';

type Payload = Record<string, unknown>;

@ApiTags('technician')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or non-technician role.')
@UseGuards(JwtAuthGuard)
@Roles('technician')
@Controller('technician')
export class TechnicianSelfController {
  constructor(private readonly selfService: TechnicianSelfService) {}

  @Get('profile')
  @ApiEnvelopeOk('TechnicianSelfProfileDto', 200, 'Own technician profile (lazily created for onboarding).')
  async getProfile(@CurrentUser() user: RequestUser): Promise<ApiSuccess<Payload>> {
    return { data: await this.selfService.getProfile(user.id) };
  }

  @Patch('profile')
  @ApiZodBody(technicianProfileUpdateSchema)
  @ApiEnvelopeOk('TechnicianSelfProfileDto', 200, 'Profile updated (editable fields only).')
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(technicianProfileUpdateSchema)) body: TechnicianProfileUpdateInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.selfService.updateProfile(user.id, body) };
  }

  @Get('services')
  @ApiEnvelopeOk('TechnicianSelfServiceDto', 200, 'Own attached catalog services.')
  async listServices(@CurrentUser() user: RequestUser): Promise<ApiSuccess<Payload[]>> {
    return { data: await this.selfService.listServicesForUser(user.id) };
  }

  @Post('services')
  @HttpCode(201)
  @ApiZodBody(technicianServiceAddSchema)
  @ApiEnvelopeOk('TechnicianSelfServiceDto', 201, 'Service attached (price_from optional).')
  @ApiEnvelopeError(404, 'Service not found in the catalog.')
  @ApiEnvelopeError(409, 'Service already attached.')
  async addService(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(technicianServiceAddSchema)) body: TechnicianServiceAddInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.selfService.addService(user.id, body) };
  }

  @Delete('services/:serviceId')
  @HttpCode(204)
  @ApiEnvelopeError(404, 'Service not attached to this technician.')
  async removeService(
    @CurrentUser() user: RequestUser,
    @Param('serviceId') serviceId: string,
  ): Promise<void> {
    await this.selfService.removeService(user.id, serviceId);
  }

  /** Documented alias of the role-scoped request list (docs/07 §16). */
  @Get('requests')
  @ApiZodQuery(serviceRequestListQuerySchema)
  @ApiEnvelopeOk('ServiceRequestSummaryDto', 200, 'Role-scoped requests (pending targeted + assigned).')
  async listRequests(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(serviceRequestListQuerySchema)) query: ServiceRequestListQuery,
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.selfService.listRequests(user.id, query);
    return { data: items, meta };
  }

  /** Server-derived statistics (docs/07 §16 — never client-computed). */
  @Get('stats')
  @ApiEnvelopeOk('TechnicianStatsDto', 200, 'Server-derived request counters + rating metrics.')
  async stats(@CurrentUser() user: RequestUser): Promise<ApiSuccess<Payload>> {
    return { data: await this.selfService.stats(user.id) };
  }
}

