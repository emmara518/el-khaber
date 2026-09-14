/**
 * Admin operational controllers (Task 10K). Sources: docs/07 §18,
 * docs/09_ADMIN.md §4–§17, Task 10I admin patterns (AuthKind admin).
 * Every mutation is audited and server-authoritative.
 */

import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { paginationSchema } from '@khabir/shared-validation';

import { AuthKind, CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminUsersService } from './admin-users.service';
import { AdminOperationsService } from './admin-operations.service';

import type { ApiMeta, ApiSuccess } from '@khabir/shared-types';
import { z } from 'zod';

type Payload = Record<string, unknown>;

const usersListQuery = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['customer', 'technician', 'merchant']).optional(),
  status: z.enum(['active', 'suspended', 'pending', 'deleted']).optional(),
});
type UsersListQuery = z.infer<typeof usersListQuery>;

const technicianListQuery = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  verification_status: z.enum(['pending', 'verified', 'rejected', 'suspended']).optional(),
});
type TechnicianListQuery = z.infer<typeof technicianListQuery>;

const serviceRequestListQuery = paginationSchema.extend({
  status: z
    .enum(['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'])
    .optional(),
});
type ServiceRequestAdminListQuery = z.infer<typeof serviceRequestListQuery>;

const setVerificationBody = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'suspended']),
});

const setRequestStatusBody = z.object({
  status: z.enum(['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled']),
});
type SetRequestStatusBody = z.infer<typeof setRequestStatusBody>;

const auditListQuery = paginationSchema.extend({
  entity_type: z.string().trim().min(1).max(64).optional(),
});
type AuditListQuery = z.infer<typeof auditListQuery>;

@ApiTags('admin')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Admin authority required.')
@UseGuards(JwtAuthGuard)
@AuthKind('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly operations: AdminOperationsService,
  ) {}

  // --- Dashboard metrics (docs/09 §4) --------------------------------------

  @Get('metrics')
  @ApiEnvelopeOk('AdminMetricsDto', 200, 'Platform counts (no decorative metrics).')
  async metrics(): Promise<ApiSuccess<Payload>> {
    return { data: await this.operations.metrics() };
  }

  // --- User management (docs/09 §5) ----------------------------------------

  @Get('users')
  @ApiZodQuery(usersListQuery)
  @ApiEnvelopeOk('AdminUserDto', 200, 'Users (search by email/phone, filter role/status).')
  async listUsers(
    @Query(new ZodValidationPipe(usersListQuery)) query: UsersListQuery,
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.users.listUsers(query);
    return { data: items, meta };
  }

  @Get('users/:id')
  @ApiEnvelopeOk('AdminUserDetailDto', 200, 'User detail with role-appropriate profile + counts.')
  @ApiEnvelopeError(404, 'User not found.')
  async getUser(@Param('id') id: string): Promise<ApiSuccess<Payload>> {
    return { data: await this.users.getUser(id) };
  }

  // --- Verification state machine (docs/09 §6) ------------------------------

  @Get('technicians')
  @ApiZodQuery(technicianListQuery)
  @ApiEnvelopeOk('AdminTechnicianDto', 200, 'Technician profiles (verification filter).')
  async listTechnicians(
    @Query(new ZodValidationPipe(technicianListQuery)) query: TechnicianListQuery,
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    // Map the documented snake_case query onto the service contract.
    const { items, meta } = await this.operations.listTechnicians({
      page: query.page,
      limit: query.limit,
      q: query.q,
      verificationStatus: query.verification_status,
    });
    return { data: items, meta };
  }

  @Post('technicians/:id/verification')
  @HttpCode(200)
  @ApiEnvelopeOk('AdminVerificationResultDto', 200, 'Verification status set (audited).')
  @ApiEnvelopeError(404, 'Technician profile not found.')
  @ApiEnvelopeError(409, 'Verification status already set.')
  async setTechnicianVerification(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setVerificationBody)) body: { status: string },
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.operations.setVerification(admin.id, 'technician', id, body.status as never) };
  }

  @Get('merchants')
  @ApiZodQuery(technicianListQuery)
  @ApiEnvelopeOk('AdminMerchantDto', 200, 'Merchant profiles (verification filter).')
  async listMerchants(
    @Query(new ZodValidationPipe(technicianListQuery)) query: TechnicianListQuery,
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    // Map the documented snake_case query onto the service contract.
    const { items, meta } = await this.operations.listMerchants({
      page: query.page,
      limit: query.limit,
      q: query.q,
      verificationStatus: query.verification_status,
    });
    return { data: items, meta };
  }

  @Post('merchants/:id/verification')
  @HttpCode(200)
  @ApiEnvelopeOk('AdminVerificationResultDto', 200, 'Verification status set (audited).')
  @ApiEnvelopeError(404, 'Merchant profile not found.')
  @ApiEnvelopeError(409, 'Verification status already set.')
  async setMerchantVerification(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setVerificationBody)) body: { status: string },
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.operations.setVerification(admin.id, 'merchant', id, body.status as never) };
  }

  // --- Service-request operations (docs/09 §10) ----------------------------

  @Get('service-requests')
  @ApiZodQuery(serviceRequestListQuery)
  @ApiEnvelopeOk('AdminServiceRequestDto', 200, 'All service requests (status filter).')
  async listServiceRequests(
    @Query(new ZodValidationPipe(serviceRequestListQuery)) query: ServiceRequestAdminListQuery,
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.operations.listServiceRequests(query);
    return { data: items, meta };
  }

  @Post('service-requests/:id/status')
  @HttpCode(200)
  @ApiEnvelopeOk('AdminStatusOverrideResultDto', 200, 'Status override (audited; history + notification).')
  @ApiEnvelopeError(404, 'Service request not found.')
  @ApiEnvelopeError(409, 'Unsupported status / unchanged.')
  async setServiceRequestStatus(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setRequestStatusBody)) body: SetRequestStatusBody,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.operations.setServiceRequestStatus(admin.id, id, body.status) };
  }

  // --- Review moderation (docs/09 §11) -------------------------------------

  @Get('reviews')
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('AdminReviewDto', 200, 'All reviews (moderation queue).')
  async listReviews(
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.operations.listReviews(query);
    return { data: items, meta };
  }

  @Post('reviews/:id/remove')
  @HttpCode(200)
  @ApiEnvelopeOk('AdminReviewRemoveResultDto', 200, 'Review removed per policy (audited; metrics recomputed).')
  @ApiEnvelopeError(404, 'Review not found.')
  async removeReview(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.operations.removeReview(admin.id, id) };
  }

  // --- Audit-log read (docs/09 §17) ----------------------------------------

  @Get('audit-logs')
  @ApiZodQuery(auditListQuery)
  @ApiEnvelopeOk('AuditLogDto', 200, 'Audit trail (entity-type filter; newest first).')
  async listAuditLogs(
    @Query(new ZodValidationPipe(auditListQuery)) query: AuditListQuery,
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    // Map the documented snake_case query onto the service contract.
    const { items, meta } = await this.operations.listAuditLogs({
      page: query.page,
      limit: query.limit,
      entityType: query.entity_type,
    });
    return { data: items, meta };
  }
}
