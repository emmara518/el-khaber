/**
 * ADMIN verification + catalog + service-request operations
 * (Task 10K). Sources: docs/09_ADMIN.md §6/§10/§11, docs/07 §18.
 *
 * Verification is a state machine (pending/verified/rejected/suspended),
 * Admin-only, audited — never arbitrated by a user role or hidden in a
 * client. Reviews moderation: admin list + deletion per policy (audited).
 * Service-request operation: admin detail + status override (audited).
 */

import { Injectable, NotFoundException } from '@nestjs/common';

import { buildPageMeta } from '@khabir/shared-types';

import { PrismaService } from '../database/prisma.service';
import { ConflictException } from '../common/errors';

import type { Prisma } from '@prisma/client';

const VERIFICATION_STATES = ['pending', 'verified', 'rejected', 'suspended'] as const;
type VerificationState = (typeof VERIFICATION_STATES)[number];

const REQUEST_OVERWRITABLE: ReadonlySet<string> = new Set([
  'pending',
  'accepted',
  'on_the_way',
  'in_progress',
  'completed',
  'cancelled',
]);

@Injectable()
export class AdminOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Verification state machine (docs/09 §6) ------------------------------

  async listTechnicians(
    query: { page: number; limit: number; q?: string; verificationStatus?: string },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.TechnicianProfileWhereInput = {
      ...(query.verificationStatus !== undefined
        ? { verificationStatus: query.verificationStatus as never }
        : {}),
      ...(query.q !== undefined
        ? { user: { OR: [{ email: { contains: query.q, mode: 'insensitive' as const } }, { phone: { contains: query.q } }] } }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.technicianProfile.count({ where }),
      this.prisma.technicianProfile.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          displayName: true,
          verificationStatus: true,
          experienceYears: true,
          completedServicesCount: true,
          ratingAverage: true,
          ratingCount: true,
          availabilityStatus: true,
          user: { select: { id: true, email: true, phone: true, status: true, createdAt: true } },
        },
      }),
    ]);
    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }

  async setVerification(
    adminId: string,
    kind: 'technician' | 'merchant',
    profileId: string,
    status: VerificationState,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      if (kind === 'technician') {
        const before = await tx.technicianProfile.findFirst({
          where: { id: profileId },
          select: { id: true, verificationStatus: true, userId: true },
        });
        if (before === null) {
          return 'not-found' as const;
        }
        if (before.verificationStatus === status) {
          return 'unchanged' as const;
        }
        const row = await tx.technicianProfile.update({
          where: { id: profileId },
          data: { verificationStatus: status },
          select: { id: true, verificationStatus: true, userId: true },
        });
        await tx.auditLog.create({
          data: {
            actorAdminId: adminId,
            entityType: 'technician_verification',
            entityId: profileId,
            action: `admin.verification.${status}`,
            beforeJson: { verificationStatus: before.verificationStatus } as never,
            afterJson: { verificationStatus: status, userId: row.userId } as never,
          },
        });
        return { id: row.id, verificationStatus: row.verificationStatus, userId: row.userId, at: now } as const;
      }
      const before = await tx.merchantProfile.findFirst({
        where: { id: profileId },
        select: { id: true, verificationStatus: true, userId: true },
      });
      if (before === null) {
        return 'not-found' as const;
      }
      if (before.verificationStatus === status) {
        return 'unchanged' as const;
      }
      const row = await tx.merchantProfile.update({
        where: { id: profileId },
        data: { verificationStatus: status },
        select: { id: true, verificationStatus: true, userId: true },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          entityType: 'merchant_verification',
          entityId: profileId,
          action: `admin.verification.${status}`,
          beforeJson: { verificationStatus: before.verificationStatus } as never,
          afterJson: { verificationStatus: status, userId: row.userId } as never,
        },
      });
      return { id: row.id, verificationStatus: row.verificationStatus, userId: row.userId, at: now } as const;
    });
    if (result === 'not-found') {
      throw new NotFoundException(`${kind === 'technician' ? 'Technician' : 'Merchant'} profile not found`);
    }
    if (result === 'unchanged') {
      throw new ConflictException('Verification state already set');
    }
    return result;
  }

  async listMerchants(
    query: { page: number; limit: number; q?: string; verificationStatus?: string },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.MerchantProfileWhereInput = {
      ...(query.verificationStatus !== undefined
        ? { verificationStatus: query.verificationStatus as never }
        : {}),
      ...(query.q !== undefined
        ? {
            OR: [
              { businessName: { contains: query.q, mode: 'insensitive' as const } },
              { contactPhone: { contains: query.q } },
              { user: { email: { contains: query.q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.merchantProfile.count({ where }),
      this.prisma.merchantProfile.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          businessName: true,
          contactPhone: true,
          verificationStatus: true,
          user: { select: { id: true, email: true, status: true, createdAt: true } },
        },
      }),
    ]);
    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }

  // --- Service-request operations ------------------------------------------

  async listServiceRequests(
    query: { page: number; limit: number; status?: string },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.ServiceRequestWhereInput =
      query.status !== undefined ? { status: query.status as never } : {};
    const [total, rows] = await Promise.all([
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          problemTitle: true,
          problemDescription: true,
          scheduledAt: true,
          createdAt: true,
          customer: { select: { id: true, email: true } },
          technician: { select: { id: true, displayName: true } },
        },
      }),
    ]);
    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }

  async setServiceRequestStatus(
    adminId: string,
    id: string,
    status: string,
  ): Promise<Record<string, unknown>> {
    if (!REQUEST_OVERWRITABLE.has(status)) {
      throw new ConflictException('Unsupported status');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const before = await tx.serviceRequest.findFirst({
        where: { id },
        select: { id: true, status: true, customerId: true },
      });
      if (before === null) {
        return 'not-found' as const;
      }
      if (before.status === status) {
        return 'unchanged' as const;
      }
      const now = new Date();
      const row = await tx.serviceRequest.update({
        where: { id },
        data: {
          status: status as never,
          ...(status === 'cancelled' ? { cancelledAt: now } : {}),
          ...(status === 'completed' ? { completedAt: now } : {}),
        },
        select: { id: true, status: true, customerId: true },
      });
      await tx.serviceRequestStatusHistory.create({
        data: {
          serviceRequestId: id,
          fromStatus: before.status,
          toStatus: status as never,
          changedByUserId: null, // admin override (no user actor)
        },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          entityType: 'service_request',
          entityId: id,
          action: 'admin.service_request.override',
          beforeJson: { status: before.status } as never,
          afterJson: { status } as never,
        },
      });
      await tx.notification.create({
        data: {
          userId: row.customerId,
          type: 'request_status',
          titleAr: 'تم تحديث حالة الطلب بواسطة الإدارة',
          bodyAr: `حالة طلبك أصبحت: ${status}.`,
        },
      });
      return { id: row.id, status } as const;
    });
    if (result === 'not-found') {
      throw new NotFoundException('Service request not found');
    }
    if (result === 'unchanged') {
      throw new ConflictException('Service request already in this status');
    }
    return result;
  }

  // --- Review moderation ---------------------------------------------------

  async listReviews(
    query: { page: number; limit: number },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.ReviewWhereInput = {};
    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          serviceRequest: { select: { id: true, status: true } },
          technician: { select: { id: true, displayName: true } },
          tagAssignments: { select: { tag: { select: { labelAr: true } } } },
        },
      }),
    ]);
    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }

  async removeReview(adminId: string, reviewId: string): Promise<Record<string, unknown>> {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.findFirst({
        where: { id: reviewId },
        select: { id: true, technicianId: true, rating: true },
      });
      if (review === null) {
        return 'not-found' as const;
      }
      await tx.review.delete({ where: { id: reviewId } });
      // Recompute derived metrics (docs/06 §27).
      const ratings = await tx.review.findMany({
        where: { technicianId: review.technicianId },
        select: { rating: true },
      });
      const count = ratings.length;
      const average = count === 0 ? 0 : ratings.reduce((s, r) => s + r.rating, 0) / count;
      await tx.technicianProfile.update({
        where: { id: review.technicianId },
        data: {
          ratingAverage: count === 0 ? null : Math.round(average * 100) / 100,
          ratingCount: count,
        },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          entityType: 'review',
          entityId: reviewId,
          action: 'admin.review.remove',
          beforeJson: { rating: review.rating } as never,
          afterJson: { removed: true } as never,
        },
      });
      return { id: reviewId, removed: true } as const;
    }).then((r) => {
      if (r === 'not-found') {
        throw new NotFoundException('Review not found');
      }
      return r as Record<string, unknown>;
    });
  }

  // --- Audit log read (docs/09 §17) ----------------------------------------

  async listAuditLogs(
    query: { page: number; limit: number; entityType?: string },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.AuditLogWhereInput =
      query.entityType !== undefined ? { entityType: query.entityType } : {};
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorUserId: true,
          actorAdminId: true,
          entityType: true,
          entityId: true,
          action: true,
          beforeJson: true,
          afterJson: true,
          createdAt: true,
        },
      }),
    ]);
    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }

  // --- Dashboard metrics (docs/09 §4) --------------------------------------

  async metrics(): Promise<Record<string, unknown>> {
    const [usersCount, techniciansCount, merchantsCount, pendingServiceRequests,
      activeServiceRequests, completedServiceRequests, cancelledServiceRequests,
      activeSubscriptions, technicianProfilesCount, merchantProfilesCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.technicianProfile.count(),
        this.prisma.merchantProfile.count(),
        this.prisma.serviceRequest.count({ where: { status: 'pending' } }),
        this.prisma.serviceRequest.count({
          where: { status: { in: ['on_the_way', 'in_progress'] } },
        }),
        this.prisma.serviceRequest.count({ where: { status: 'completed' } }),
        this.prisma.serviceRequest.count({ where: { status: 'cancelled' } }),
        this.prisma.subscription.count({ where: { status: 'active' } }),
        this.prisma.technicianProfile.count({ where: { verificationStatus: 'verified' } }),
        this.prisma.merchantProfile.count({ where: { verificationStatus: 'verified' } }),
      ]);
    return {
      usersCount,
      techniciansCount,
      merchantsCount,
      serviceRequests: {
        pending: pendingServiceRequests,
        active: activeServiceRequests,
        completed: completedServiceRequests,
        cancelled: cancelledServiceRequests,
      },
      activeSubscriptions,
      verified: { technicians: technicianProfilesCount, merchants: merchantProfilesCount },
    };
  }
}
