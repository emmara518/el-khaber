/**
 * Subscriptions + entitlements service (Task 10I).
 * Sources: docs/07_API.md §14–§15, docs/08_SUBSCRIPTIONS.md, docs/06 §19.
 *
 * Authoritative entitlement chain (docs/08 §4):
 *   principal → active Subscription (status=active, within period)
 *             → Plan → PlanEntitlements → effective entitlements
 *   UNION      principal → ADMIN manual EntitlementGrant (documented codes).
 * A client request is NEVER authoritative for entitlement access.
 *
 * PROVISIONAL (reported for CTO ratification): the subscription period is
 * a 30-day constant — docs/08 does not define period/billing durations and
 * the seeded plans use billingInterval='monthly'.
 */

import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';


import { ConflictException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import {
  entitlementGrantedNotification,
  subscriptionActivatedNotification,
  subscriptionRenewalCancelledNotification,
} from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';

import type { Prisma, UserRole } from '@prisma/client';

/** PROVISIONAL period length pending CTO ratification (docs/08 undefined). */
export const PROVISIONAL_PERIOD_DAYS = 30;

const PLAN_SELECT = {
  id: true,
  role: true,
  code: true,
  nameAr: true,
  nameEn: true,
  billingInterval: true,
  price: true,
  currency: true,
  isActive: true,
  sortOrder: true,
} satisfies Prisma.SubscriptionPlanSelect;

type PlanRow = Prisma.SubscriptionPlanGetPayload<{ select: typeof PLAN_SELECT }>;

function planToDto(row: PlanRow): Record<string, unknown> {
  return {
    id: row.id,
    role: row.role,
    code: row.code,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    billingInterval: row.billingInterval,
    price: Number(row.price),
    currency: row.currency,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Active plans for the requested role (JWT role by default). */
  async listPlans(
    role: UserRole,
    query: { page: number; limit: number },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.SubscriptionPlanWhereInput = { role, isActive: true };
    const [total, rows] = await Promise.all([
      this.prisma.subscriptionPlan.count({ where }),
      this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: PLAN_SELECT,
      }),
    ]);
    return { items: rows.map(planToDto), meta: buildPageMeta(page, limit, total) };
  }

  /**
   * The principal's current subscription: the most recent subscription in
   * an effective state (active within its period, or pending payment
   * review). Inactive plans can never yield an active subscription.
   */
  async getCurrent(userId: string): Promise<Record<string, unknown> | null> {
    const row = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'pending'] } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        startedAt: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        renewalEnabled: true,
        cancelledAt: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
            role: true,
            price: true,
            currency: true,
            billingInterval: true,
            isActive: true,
          },
        },
      },
    });
    if (row === null) {
      return null;
    }
    // Expired period demotes an "active" subscription (docs/08 §8).
    const effective =
      row.status === 'active' && row.currentPeriodEnd.getTime() <= Date.now()
        ? 'expired'
        : row.status;
    return {
      id: row.id,
      status: effective,
      startedAt: row.startedAt.toISOString(),
      currentPeriodStart: row.currentPeriodStart.toISOString(),
      currentPeriodEnd: row.currentPeriodEnd.toISOString(),
      renewalEnabled: row.renewalEnabled,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      plan: {
        id: row.plan.id,
        code: row.plan.code,
        nameAr: row.plan.nameAr,
        nameEn: row.plan.nameEn,
        role: row.plan.role,
        price: Number(row.plan.price),
        currency: row.plan.currency,
        billingInterval: row.plan.billingInterval,
        isActive: row.plan.isActive,
      },
    };
  }

  /** Effective entitlement codes: active-plan entitlements ∪ manual grants. */
  async effectiveEntitlementCodes(userId: string, role: UserRole): Promise<string[]> {
    const codes = new Set<string>();

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        currentPeriodEnd: { gt: new Date() },
        plan: { isActive: true, role },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        plan: { select: { entitlements: { select: { entitlement: { select: { code: true } } } } } },
      },
    });
    for (const pe of subscription?.plan.entitlements ?? []) {
      codes.add(pe.entitlement.code);
    }

    const grants = await this.prisma.entitlementGrant.findMany({
      where: { userId, entitlement: { isActive: true } },
      select: { entitlement: { select: { code: true } } },
    });
    for (const grant of grants) {
      codes.add(grant.entitlement.code);
    }

    return [...codes].sort();
  }

  /** POST /subscriptions/:id/cancel — cancels RENEWAL (docs/08 §10). */
  async cancelRenewal(userId: string, subscriptionId: string): Promise<Record<string, unknown>> {
    // Atomic owner-scoped mutation; only an ACTIVE subscription cancels.
    // Task 10M: the confirmation notification is written in the SAME
    // transaction, and only on the transition where renewal was still
    // enabled (a repeated idempotent cancel does not duplicate it).
    const result = await this.prisma.$transaction(async (tx) => {
      const before = await tx.subscription.findFirst({
        where: { id: subscriptionId, userId },
        select: { status: true, renewalEnabled: true },
      });
      if (before === null) {
        return 'not-found' as const;
      }
      // Not active: cancellation/renewal mutation is not applicable.
      if (before.status !== 'active') {
        return 'not-active' as const;
      }
      await tx.subscription.updateMany({
        where: { id: subscriptionId, userId, status: 'active' },
        data: { renewalEnabled: false, cancelledAt: new Date() },
      });
      if (before.renewalEnabled) {
        await this.notifications.create(userId, subscriptionRenewalCancelledNotification(), tx);
      }
      return 'cancelled' as const;
    });
    if (result === 'not-found') {
      throw new NotFoundException('Subscription not found');
    }
    if (result === 'not-active') {
      throw new ConflictException('Subscription is not active');
    }
    const current = await this.getCurrent(userId);
    return current ?? { id: subscriptionId, renewalEnabled: false };
  }

  /**
   * ADMIN: manual subscription grant (CTO contract §17). Creates an ACTIVE
   * subscription — never a payment submission. An existing ACTIVE
   * subscription is a documented conflict (409) pending CTO semantics.
   */
  async adminGrantSubscription(
    adminId: string,
    userId: string,
    planId: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findFirst({ where: { id: userId }, select: { id: true, role: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: planId },
      select: { id: true, role: true, isActive: true, code: true },
    });
    if (plan === null) {
      throw new NotFoundException('Plan not found');
    }
    if (!plan.isActive) {
      // Inactive plans remain non-purchasable, even by manual grant.
      throw new ConflictException('Plan is not active');
    }
    if (plan.role !== user.role) {
      throw new ConflictException('Plan role does not match the user role');
    }
    const existingActive = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      select: { id: true },
    });
    if (existingActive !== null) {
      // MANUAL SUBSCRIPTION GRANT CONFLICT — CTO decision required
      // (replacement/extension semantics are undefined).
      throw new ConflictException('User already has an active subscription');
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + PROVISIONAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const created = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          planId,
          status: 'active',
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          renewalEnabled: true,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          entityType: 'subscription',
          entityId: subscription.id,
          action: 'admin.manual_grant.subscription',
          afterJson: { userId, planId, periodDays: PROVISIONAL_PERIOD_DAYS } as never,
        },
      });
      // Subscription event → persisted notification for the recipient
      // (server-derived user id), same transaction as activation + audit.
      await this.notifications.create(userId, subscriptionActivatedNotification(), tx);
      return subscription;
    });
    return { id: created.id, userId, planId, status: 'active' };
  }

  /**
   * ADMIN: manual entitlement grant (CTO contract §18) — documented codes
   * only, no fake payment, audited, unique per (user, entitlement).
   */
  async adminGrantEntitlement(
    adminId: string,
    userId: string,
    entitlementId: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findFirst({ where: { id: userId }, select: { id: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const entitlement = await this.prisma.entitlement.findFirst({
      where: { id: entitlementId },
      select: { id: true, code: true, nameAr: true, isActive: true },
    });
    if (entitlement === null) {
      throw new NotFoundException('Entitlement not found');
    }
    if (!entitlement.isActive) {
      throw new ConflictException('Entitlement is not active');
    }
    const existing = await this.prisma.entitlementGrant.findFirst({
      where: { userId, entitlementId },
      select: { id: true },
    });
    if (existing !== null) {
      throw new ConflictException('Entitlement already granted to this user');
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const grant = await tx.entitlementGrant.create({
        data: { userId, entitlementId, grantedByAdminId: adminId },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          entityType: 'entitlement_grant',
          entityId: grant.id,
          action: 'admin.manual_grant.entitlement',
          afterJson: { userId, entitlementId, code: entitlement.code } as never,
        },
      });
      // Subscription-adjacent event → persisted notification (same tx).
      await this.notifications.create(userId, entitlementGrantedNotification(entitlement.nameAr), tx);
      return grant;
    });
    return { id: created.id, userId, entitlementId, code: entitlement.code };
  }
}
