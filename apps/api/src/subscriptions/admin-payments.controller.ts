/**
 * ADMIN payment review + configuration + grants + operational
 * notifications (Task 10I). Admin authority only (@AuthKind('admin')).
 * Every mutation is server-authoritative, audited, and state-guarded.
 */

import {
  adminGrantEntitlementSchema,
  adminGrantSubscriptionSchema,
  adminNotificationSchema,
  adminPaymentConfigUpsertSchema,
  adminSubmissionListQuerySchema,
  paymentMethodSchema,
  type AdminGrantEntitlementInput,
  type AdminGrantSubscriptionInput,
  type AdminNotificationInput,
  type AdminPaymentConfigUpsertInput,
  type AdminSubmissionListQuery,
} from '@khabir/shared-validation';
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { AuthKind, CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { PaymentsService } from './payments.service';
import { SubscriptionsService } from './subscriptions.service';

import type { ApiMeta, ApiSuccess } from '@khabir/shared-types';

type Payload = Record<string, unknown>;

@ApiTags('admin-payments')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Admin authority required.')
@UseGuards(JwtAuthGuard)
@AuthKind('admin')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // --- Payment destination configuration (CTO contract §1.3) ---------------

  @Get('config')
  @ApiEnvelopeOk('PaymentMethodConfigDto', 200, 'All configured manual payment destinations.')
  async getConfig(@CurrentUser() _admin: RequestUser): Promise<ApiSuccess<Payload[]>> {
    return { data: await this.payments.adminListConfig() };
  }

  @Put('config/:method')
  @ApiZodBody(adminPaymentConfigUpsertSchema)
  @ApiEnvelopeOk('PaymentMethodConfigDto', 200, 'Payment destination upserted (audited).')
  async upsertConfig(
    @CurrentUser() admin: RequestUser,
    @Param('method') method: string,
    @Body(new ZodValidationPipe(adminPaymentConfigUpsertSchema)) body: AdminPaymentConfigUpsertInput,
  ): Promise<ApiSuccess<Payload>> {
    const parsed = paymentMethodSchema.parse(method);
    return { data: await this.payments.adminUpsertConfig(admin.id, parsed, body) };
  }

  // --- Payment review (CTO contract §1.5) ----------------------------------

  @Get('submissions')
  @ApiZodQuery(adminSubmissionListQuerySchema)
  @ApiEnvelopeOk('PaymentSubmissionDto', 200, 'Payment submissions (oldest first for the review queue).')
  async listSubmissions(
    @CurrentUser() _admin: RequestUser,
    @Query(new ZodValidationPipe(adminSubmissionListQuerySchema)) query: AdminSubmissionListQuery,
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.payments.adminListSubmissions(query.status, query);
    return { data: items, meta };
  }

  @Get('submissions/:id')
  @ApiEnvelopeOk('PaymentSubmissionDto', 200, 'Submission detail (incl. typed proof reference).')
  @ApiEnvelopeError(404, 'Payment submission not found.')
  async detail(@Param('id') id: string): Promise<ApiSuccess<Payload>> {
    return { data: await this.payments.adminDetail(id) };
  }

  @Post('submissions/:id/approve')
  @HttpCode(200)
  @ApiEnvelopeOk('PaymentApprovalResultDto', 200, 'Approved: ACTIVE subscription + audit + notification (one transaction).')
  @ApiEnvelopeError(404, 'Payment submission not found.')
  @ApiEnvelopeError(409, 'Already reviewed / plan unavailable (canonical envelope).')
  async approve(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.payments.adminApprove(admin.id, id, undefined) };
  }

  @Post('submissions/:id/reject')
  @HttpCode(200)
  @ApiEnvelopeOk('PaymentRejectResultDto', 200, 'Rejected: no activation + audit + notification (one transaction).')
  @ApiEnvelopeError(404, 'Payment submission not found.')
  @ApiEnvelopeError(409, 'Already reviewed (canonical envelope).')
  async reject(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.payments.adminReject(admin.id, id, undefined) };
  }
}

@ApiTags('admin')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(401, 'Admin authority required.')
@UseGuards(JwtAuthGuard)
@AuthKind('admin')
@Controller('admin')
export class AdminGrantsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  /** MANUAL SUBSCRIPTION GRANT (CTO contract §1.7): no payment record. */
  @Post('subscriptions/grant')
  @HttpCode(201)
  @ApiZodBody(adminGrantSubscriptionSchema)
  @ApiEnvelopeOk('AdminGrantResultDto', 201, 'ACTIVE subscription granted manually (audited).')
  @ApiEnvelopeError(404, 'User or plan not found.')
  @ApiEnvelopeError(409, 'Active-subscription conflict / plan inactive / role mismatch.')
  async grantSubscription(
    @CurrentUser() admin: RequestUser,
    @Body(new ZodValidationPipe(adminGrantSubscriptionSchema)) body: AdminGrantSubscriptionInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.subscriptions.adminGrantSubscription(admin.id, body.user_id, body.plan_id) };
  }

  /** MANUAL ENTITLEMENT GRANT (CTO contract §1.8): documented codes only. */
  @Post('entitlements/grant')
  @HttpCode(201)
  @ApiZodBody(adminGrantEntitlementSchema)
  @ApiEnvelopeOk('AdminGrantResultDto', 201, 'Entitlement granted manually (audited).')
  @ApiEnvelopeError(404, 'User or entitlement not found.')
  @ApiEnvelopeError(409, 'Entitlement already granted / inactive.')
  async grantEntitlement(
    @CurrentUser() admin: RequestUser,
    @Body(new ZodValidationPipe(adminGrantEntitlementSchema)) body: AdminGrantEntitlementInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.subscriptions.adminGrantEntitlement(admin.id, body.user_id, body.entitlement_id) };
  }
}

/** ADMIN operational notifications (CTO contract §1.6): recipient-scoped. */
@ApiTags('admin')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(401, 'Admin authority required.')
@UseGuards(JwtAuthGuard)
@AuthKind('admin')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(201)
  @ApiZodBody(adminNotificationSchema)
  @ApiEnvelopeOk('AdminNotificationResultDto', 201, 'Operational notification created (audited).')
  @ApiEnvelopeError(404, 'Recipient user not found.')
  async notify(
    @CurrentUser() admin: RequestUser,
    @Body(new ZodValidationPipe(adminNotificationSchema)) body: AdminNotificationInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.payments.adminNotify(admin.id, body) };
  }
}
