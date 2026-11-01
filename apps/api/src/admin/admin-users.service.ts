/**
 * ADMIN user management (Task 10K). Source: docs/09_ADMIN.md §5.
 * Read-only user inspection: search, account status, role; per-domain
 * profiles; verification state; subscription context. NO arbitrary
 * account mutation — identity/role/status mutations are NOT part of the
 * approved admin surface.
 */

import { Injectable, NotFoundException } from '@nestjs/common';

import { buildPageMeta } from '@khabir/shared-types';

import { ConflictException, ValidationException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

import type { Prisma, UserRole } from '@prisma/client';

const USER_LIST_SELECT = {
  id: true,
  role: true,
  status: true,
  phone: true,
  email: true,
  phoneVerified: true,
  emailVerified: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: {
    page: number;
    limit: number;
    q?: string;
    role?: UserRole;
    status?: string;
  }): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.UserWhereInput = {
      ...(query.q !== undefined
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' as const } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
      ...(query.role !== undefined ? { role: query.role } : {}),
      ...(query.status !== undefined
        ? { status: query.status as Prisma.EnumUserStatusFilter['equals'] }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: USER_LIST_SELECT,
      }),
    ]);
    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }

  async getUser(id: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findFirst({
      where: { id },
      select: USER_LIST_SELECT,
    });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const [
      profile,
      technicianProfile,
      merchantProfile,
      subscription,
      productsCount,
      serviceRequestsCount,
    ] = await Promise.all([
      this.prisma.customerProfile.findFirst({ where: { userId: id } }),
      this.prisma.technicianProfile.findFirst({
        where: { userId: id },
        select: {
          id: true,
          verificationStatus: true,
          experienceYears: true,
          completedServicesCount: true,
          ratingAverage: true,
          ratingCount: true,
          availabilityStatus: true,
        },
      }),
      this.prisma.merchantProfile.findFirst({
        where: { userId: id },
        select: {
          id: true,
          businessName: true,
          bio: true,
          logoUrl: true,
          verificationStatus: true,
          contactPhone: true,
        },
      }),
      this.prisma.subscription.findFirst({
        where: { userId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          plan: { select: { code: true, nameAr: true } },
        },
      }),
      this.prisma.product.count({ where: { merchant: { userId: id } } }),
      this.prisma.serviceRequest.count({
        where: { OR: [{ customerId: id }, { technician: { userId: id } }] },
      }),
    ]);
    // The technician's own attached catalog services — never the global
    // service-catalog size (docs/09 §5 user detail).
    const technicianServicesCount =
      technicianProfile === null
        ? 0
        : await this.prisma.technicianService.count({
            where: { technicianId: technicianProfile.id },
          });
    return {
      user,
      profile,
      technicianProfile,
      merchantProfile,
      subscription,
      counts: {
        catalogServices: technicianServicesCount,
        products: productsCount,
        serviceRequests: serviceRequestsCount,
      },
    };
  }

  /**
   * Account suspension/reactivation. The JWT guard already re-reads the
   * user status and tokenVersion on every request; incrementing
   * tokenVersion here makes the suspension effective immediately instead
   * of waiting for the access token to expire.
   */
  async setUserStatus(
    adminId: string,
    userId: string,
    status: 'active' | 'suspended',
    reason?: string,
  ): Promise<Record<string, unknown>> {
    const trimmedReason = reason?.trim() ?? '';
    if (status === 'suspended' && trimmedReason.length === 0) {
      throw new ValidationException('A reason is required to suspend an account', {
        reason: 'Provide the suspension reason',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findFirst({
        where: { id: userId },
        select: { id: true, status: true },
      });
      if (before === null) {
        return 'not-found' as const;
      }
      if (before.status === 'deleted') {
        throw new ConflictException('Deleted accounts cannot be reactivated');
      }
      if (before.status === status) {
        const current = await tx.user.findFirst({
          where: { id: userId },
          select: USER_LIST_SELECT,
        });
        if (current === null) {
          return 'not-found' as const;
        }
        return current;
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          status,
          ...(status === 'suspended' ? { tokenVersion: { increment: 1 } } : {}),
        },
        select: USER_LIST_SELECT,
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          entityType: 'user',
          entityId: userId,
          action: 'admin.user.status',
          beforeJson: { status: before.status } as never,
          afterJson: {
            status,
            ...(trimmedReason.length > 0 ? { reason: trimmedReason } : {}),
          } as never,
        },
      });
      return updated;
    });

    if (result === 'not-found') {
      throw new NotFoundException('User not found');
    }
    return result;
  }
}
