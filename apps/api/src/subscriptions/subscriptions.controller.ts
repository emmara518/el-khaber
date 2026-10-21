/**
 * Subscription + payment endpoints (Task 10I). Sources: docs/07 §14–§15.
 * Identity from JWT; client status/plan/entitlement values never trusted.
 */

import {
  cancelSubscriptionSchema,
  createPaymentSubmissionSchema,
  paginationSchema,
  type CreatePaymentSubmissionInput,
} from '@khabir/shared-validation';
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { PaymentsService } from './payments.service';
import { SubscriptionsService } from './subscriptions.service';

import type { ApiMeta, ApiSuccess } from '@khabir/shared-types';

type Payload = Record<string, unknown>;

@ApiTags('subscriptions')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or role mismatch.')
@UseGuards(JwtAuthGuard)
@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly payments: PaymentsService,
  ) {}

  /** GET /subscription-plans?role=... — active plans, role-scoped (07 §14). */
  @Get('subscription-plans')
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('SubscriptionPlanDto', 200, 'Active plans for the current user role (paginated).')
  async listPlans(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.subscriptions.listPlans(user.role, query);
    return { data: items, meta };
  }

  /**
   * POST /subscriptions (07 §14 "initiates activation"): creates a PENDING
   * manual payment submission for the selected plan (CTO flow §1.2).
   */
  @Post('subscriptions')
  @HttpCode(201)
  @ApiZodBody(createPaymentSubmissionSchema)
  @ApiEnvelopeOk('PaymentSubmissionDto', 201, 'Payment submission created (pending admin review).')
  @ApiEnvelopeError(404, 'Plan not found.')
  @ApiEnvelopeError(409, 'Plan unavailable / method disabled / role mismatch.')
  async createSubmission(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPaymentSubmissionSchema)) body: CreatePaymentSubmissionInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.payments.createSubmission(user.id, user.role, body) };
  }

  /** Own payment submissions (resubmission history preserved). */
  @Get('payments/submissions')
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('PaymentSubmissionDto', 200, 'Own payment submissions (paginated).')
  async listOwnSubmissions(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<Payload[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.payments.listOwn(user.id, query);
    return { data: items, meta };
  }

  /** GET /subscriptions/current (07 §14). */
  @Get('subscriptions/current')
  @ApiEnvelopeOk('CurrentSubscriptionDto', 200, 'Current subscription or null.')
  async current(@CurrentUser() user: RequestUser): Promise<ApiSuccess<Payload | null>> {
    return { data: await this.subscriptions.getCurrent(user.id) };
  }

  /** POST /subscriptions/:id/cancel — cancels RENEWAL (docs/08 §10). */
  @Post('subscriptions/:id/cancel')
  @HttpCode(200)
  @ApiZodBody(cancelSubscriptionSchema)
  @ApiEnvelopeOk('CurrentSubscriptionDto', 200, 'Renewal cancelled; access remains until period end.')
  @ApiEnvelopeError(404, 'Subscription not found or not owned.')
  @ApiEnvelopeError(409, 'Subscription is not active.')
  async cancel(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<Payload | null>> {
    return { data: await this.subscriptions.cancelRenewal(user.id, id) };
  }

  /** GET /me/subscription (07 §5): current plan + effective entitlements. */
  @Get('me/subscription')
  @ApiEnvelopeOk('MeSubscriptionDto', 200, 'Current subscription with effective entitlements.')
  async meSubscription(@CurrentUser() user: RequestUser): Promise<ApiSuccess<Payload>> {
    const [subscription, entitlements] = await Promise.all([
      this.subscriptions.getCurrent(user.id),
      this.subscriptions.effectiveEntitlementCodes(user.id, user.role),
    ]);
    return { data: { subscription, entitlements } };
  }

  /** GET /me/entitlements (07 §15): effective entitlement codes. */
  @Get('me/entitlements')
  @ApiEnvelopeOk('MeEntitlementsDto', 200, 'Effective entitlement codes (plan ∪ manual grants).')
  async meEntitlements(@CurrentUser() user: RequestUser): Promise<ApiSuccess<{ entitlements: string[] }>> {
    return {
      data: { entitlements: await this.subscriptions.effectiveEntitlementCodes(user.id, user.role) },
    };
  }

  /** Enabled manual payment destinations (CTO flow §1.2, step 2). */
  @Get('payments/config')
  @ApiEnvelopeOk('PaymentMethodConfigDto', 200, 'Currently enabled manual payment destinations.')
  async paymentConfig(): Promise<ApiSuccess<Payload[]>> {
    return { data: await this.payments.listEnabledMethods() };
  }
}

/** Merchant-role alias: merchant subscription UI maps here (Task 10J). */
@ApiTags('merchant')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Roles('merchant')
@Controller('merchant/subscription')
export class MerchantSubscriptionController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('current')
  @ApiEnvelopeOk('MeSubscriptionDto', 200, 'Merchant current subscription + entitlements.')
  async current(@CurrentUser() user: RequestUser): Promise<ApiSuccess<Payload>> {
    const [subscription, entitlements] = await Promise.all([
      this.subscriptions.getCurrent(user.id),
      this.subscriptions.effectiveEntitlementCodes(user.id, user.role),
    ]);
    return { data: { subscription, entitlements } };
  }

  @Post('payment')
  @HttpCode(201)
  @ApiZodBody(createPaymentSubmissionSchema)
  @ApiEnvelopeOk('PaymentSubmissionDto', 201, 'Merchant payment submission (pending admin review).')
  async submitPayment(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPaymentSubmissionSchema)) body: CreatePaymentSubmissionInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.payments.createSubmission(user.id, user.role, body) };
  }
}
