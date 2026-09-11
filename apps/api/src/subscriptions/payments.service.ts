/**
 * Manual payment service (Task 10I). Sources: docs/08_SUBSCRIPTIONS.md,
 * docs/07_API.md §14, CTO contract §1–§16.
 *
 * MVP manual payment ONLY (instapay | vodafone_cash). The user's payment
 * submission is NEVER authoritative: it stays `pending` until an ADMIN
 * approves it server-side. Approval creates the ACTIVE subscription,
 * writes the audit trail, and notifies the user — all in one transaction.
 * Rejection never activates anything and preserves the audit trail; the
 * resubmission path is a NEW submission (history is immutable).
 *
 * PAYMENT PROOF STORAGE CONTRACT GAP (reported): no approved storage
 * provider exists, so proof images cannot be uploaded/viewed yet. The
 * submission carries a typed `proofStorageKey` reference reserved for the
 * future media task, plus the admin-reviewable transfer reference.
 */


import { buildPageMeta } from '@khabir/shared-types';
import { Injectable } from '@nestjs/common';


import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

import type {
  AdminNotificationInput,
  AdminPaymentConfigUpsertInput,
  CreatePaymentSubmissionInput,
  PaymentMethodValue,
} from '@khabir/shared-validation';
import type { Prisma, PaymentMethodType, PaymentSubmissionStatus } from '@prisma/client';

const SUBMISSION_SELECT = {
  id: true,
  userId: true,
  planId: true,
  subscriptionId: true,
  method: true,
  transferReference: true,
  proofStorageKey: true,
  status: true,
  reviewedByAdminId: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSubmissionSelect;

type SubmissionRow = Prisma.PaymentSubmissionGetPayload<{ select: typeof SUBMISSION_SELECT }>;

function submissionToDto(row: SubmissionRow): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    subscriptionId: row.subscriptionId,
    method: row.method,
    transferReference: row.transferReference,
    proofStorageKey: row.proofStorageKey,
    status: row.status,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function configToDto(row: {
  method: PaymentMethodType;
  accountIdentifier: string;
  displayName: string;
  isEnabled: boolean;
}): Record<string, unknown> {
  return {
    method: row.method,
    accountIdentifier: row.accountIdentifier,
    displayName: row.displayName,
    isEnabled: row.isEnabled,
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // User: payment destinations + submission creation
  // ---------------------------------------------------------------------------

  /** Enabled manual payment destinations (07 §14 flow: user sees destination). */
  async listEnabledMethods(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.paymentMethodConfig.findMany({
      where: { isEnabled: true },
      orderBy: { method: 'asc' },
    });
    return rows.map(configToDto);
  }

  /**
   * POST /subscriptions (07 §14 "initiates activation"): creates a PENDING
   * manual payment submission. The plan must be ACTIVE and match the
   * principal's role. The submission is never authoritative.
   */
  async createSubmission(
    userId: string,
    userRole: string,
    input: CreatePaymentSubmissionInput,
  ): Promise<Record<string, unknown>> {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: input.plan_id },
      select: { id: true, role: true, isActive: true },
    });
    if (plan === null) {
      throw new NotFoundException('Plan not found');
    }
    if (!plan.isActive) {
      // Inactive plans are never purchasable (docs/08 / CTO contract §6).
      throw new ConflictException('Plan is not available');
    }
    if (plan.role !== userRole) {
      throw new ConflictException('Plan role does not match the user role');
    }
    // Only currently ENABLED methods can be selected (CTO contract §26).
    const methodConfig = await this.prisma.paymentMethodConfig.findFirst({
      where: { method: input.method as PaymentMethodType, isEnabled: true },
      select: { id: true },
    });
    if (methodConfig === null) {
      throw new ConflictException('Payment method is not available');
    }

    const row = await this.prisma.paymentSubmission.create({
      data: {
        userId,
        planId: input.plan_id,
        method: input.method as PaymentMethodType,
        transferReference: input.transfer_reference,
        proofStorageKey: input.proof_storage_key,
        status: 'pending',
      },
      select: SUBMISSION_SELECT,
    });
    return submissionToDto(row);
  }

  /** Own submissions, newest first (resubmission history is preserved). */
  async listOwn(
    userId: string,
    query: { page: number; limit: number },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.PaymentSubmissionWhereInput = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.paymentSubmission.count({ where }),
      this.prisma.paymentSubmission.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: SUBMISSION_SELECT,
      }),
    ]);
    return { items: rows.map(submissionToDto), meta: buildPageMeta(page, limit, total) };
  }

  // ---------------------------------------------------------------------------
  // Admin: configuration
  // ---------------------------------------------------------------------------

  async adminListConfig(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.paymentMethodConfig.findMany({
      orderBy: { method: 'asc' },
    });
    return rows.map(configToDto);
  }

  async adminUpsertConfig(
    adminId: string,
    method: PaymentMethodValue,
    input: AdminPaymentConfigUpsertInput,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.paymentMethodConfig.findFirst({
      where: { method: method as PaymentMethodType },
    });
    const data = {
      accountIdentifier: input.account_identifier,
      displayName: input.display_name,
      isEnabled: input.is_enabled,
    };
    let row: { method: PaymentMethodType; accountIdentifier: string; displayName: string; isEnabled: boolean };
    if (existing === null) {
      row = await this.prisma.paymentMethodConfig.create({
        data: { method: method as PaymentMethodType, ...data },
      });
    } else {
      row = await this.prisma.paymentMethodConfig.update({
        where: { id: existing.id },
        data,
      });
    }
    await this.audit.log({
      actorAdminId: adminId,
      entityType: 'payment_method_config',
      entityId: method,
      action: existing === null ? 'admin.payment_config.create' : 'admin.payment_config.update',
      before: existing === null ? null : {
        accountIdentifier: existing.accountIdentifier,
        displayName: existing.displayName,
        isEnabled: existing.isEnabled,
      },
      after: { accountIdentifier: data.accountIdentifier, displayName: data.displayName, isEnabled: data.isEnabled },
    });
    return configToDto(row);
  }

  // ---------------------------------------------------------------------------
  // Admin: payment review
  // ---------------------------------------------------------------------------

  async adminListSubmissions(
    status: PaymentSubmissionStatus | undefined,
    query: { page: number; limit: number },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.PaymentSubmissionWhereInput =
      status !== undefined ? { status } : {};
    const [total, rows] = await Promise.all([
      this.prisma.paymentSubmission.count({ where }),
      this.prisma.paymentSubmission.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: SUBMISSION_SELECT,
      }),
    ]);
    return { items: rows.map(submissionToDto), meta: buildPageMeta(page, limit, total) };
  }

  async adminDetail(id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.paymentSubmission.findFirst({
      where: { id },
      select: SUBMISSION_SELECT,
    });
    if (row === null) {
      throw new NotFoundException('Payment submission not found');
    }
    return submissionToDto(row);
  }

  /**
   * ADMIN approval: ONE transaction covering submission status, the ACTIVE
   * subscription, the audit record, and the user notification (CTO §15).
   * Duplicate approval attempts are stale (count 0 → 409).
   */
  async adminApprove(
    adminId: string,
    id: string,
    note: string | undefined,
  ): Promise<Record<string, unknown>> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const submission = await tx.paymentSubmission.findFirst({
          where: { id },
          select: {
            id: true,
            userId: true,
            planId: true,
            status: true,
            plan: { select: { isActive: true, role: true } },
            user: { select: { role: true } },
          },
        });
        if (submission === null) {
          return 'not-found' as const;
        }
        // Atomic state guard: pending → approved (no double approval).
        const claimed = await tx.paymentSubmission.updateMany({
          where: { id, status: 'pending' },
          data: { status: 'approved', reviewedByAdminId: adminId, reviewedAt: new Date() },
        });
        if (claimed.count === 0) {
          return 'stale' as const;
        }
        // Approval requires a still-active plan matching the user role.
        if (!submission.plan.isActive || submission.plan.role !== submission.user.role) {
          throw new ConflictException('Plan is not available for this user');
        }

        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const subscription = await tx.subscription.create({
          data: {
            userId: submission.userId,
            planId: submission.planId,
            status: 'active',
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            renewalEnabled: true,
          },
          select: { id: true },
        });
        await tx.paymentSubmission.update({
          where: { id },
          data: { subscriptionId: subscription.id },
        });
        await tx.auditLog.create({
          data: {
            actorAdminId: adminId,
            entityType: 'payment_submission',
            entityId: id,
            action: 'admin.payment.approve',
            beforeJson: { status: 'pending' } as never,
            afterJson: {
              status: 'approved',
              subscriptionId: subscription.id,
              userId: submission.userId,
              planId: submission.planId,
              ...(note !== undefined ? { note } : {}),
            } as never,
          },
        });
        await tx.notification.create({
          data: {
            userId: submission.userId,
            type: 'subscription',
            titleAr: 'تم اعتماد عملية الدفع',
            bodyAr: 'تم اعتماد عملية الدفع وتفعيل الاشتراك.' + (note !== undefined ? ` ملاحظة: ${note}` : ''),
          },
        });
        return { subscriptionId: subscription.id } as const;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    if (result === 'not-found') {
      throw new NotFoundException('Payment submission not found');
    }
    if (result === 'stale') {
      throw new ConflictException('Payment submission has already been reviewed');
    }
    return { id, status: 'approved', subscriptionId: result.subscriptionId };
  }

  /**
   * ADMIN rejection: never activates a subscription; preserves history;
   * notifies the user (documented operational message).
   */
  async adminReject(
    adminId: string,
    id: string,
    note: string | undefined,
  ): Promise<Record<string, unknown>> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.paymentSubmission.updateMany({
          where: { id, status: 'pending' },
          data: { status: 'rejected', reviewedByAdminId: adminId, reviewedAt: new Date() },
        });
        if (claimed.count === 0) {
          return 'stale' as const;
        }
        const submission = await tx.paymentSubmission.findFirst({
          where: { id },
          select: { userId: true },
        });
        if (submission === null) {
          return 'not-found' as const;
        }
        await tx.auditLog.create({
          data: {
            actorAdminId: adminId,
            entityType: 'payment_submission',
            entityId: id,
            action: 'admin.payment.reject',
            beforeJson: { status: 'pending' } as never,
            afterJson: {
              status: 'rejected',
              userId: submission.userId,
              ...(note !== undefined ? { note } : {}),
            } as never,
          },
        });
        await tx.notification.create({
          data: {
            userId: submission.userId,
            type: 'subscription',
            titleAr: 'تم رفض إثبات الدفع',
            bodyAr:
              'تم رفض إثبات الدفع. يمكنك إرسال طلب جديد أو التواصل مع الدعم.' +
              (note !== undefined ? ` ملاحظة: ${note}` : ''),
          },
        });
        return 'rejected' as const;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    if (result === 'not-found') {
      throw new NotFoundException('Payment submission not found');
    }
    if (result === 'stale') {
      throw new ConflictException('Payment submission has already been reviewed');
    }
    return { id, status: 'rejected' };
  }

  // ---------------------------------------------------------------------------
  // Admin: operational notification (reuses the 10H notification domain)
  // ---------------------------------------------------------------------------

  async adminNotify(
    adminId: string,
    input: AdminNotificationInput,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findFirst({
      where: { id: input.user_id },
      select: { id: true },
    });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          userId: input.user_id,
          type: input.type,
          titleAr: input.title_ar,
          bodyAr: input.body_ar,
          dataJson: (input.data_json ?? undefined) as never,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          entityType: 'notification',
          entityId: notification.id,
          action: 'admin.notification.create',
          afterJson: { userId: input.user_id, type: input.type } as never,
        },
      });
      return notification;
    });
    return { id: created.id, userId: input.user_id, type: input.type };
  }
}
