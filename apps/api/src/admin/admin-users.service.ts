/**
 * ADMIN user management (Task 10K). Source: docs/09_ADMIN.md §5.
 * Read-only user inspection: search, account status, role; per-domain
 * profiles; verification state; subscription context. NO arbitrary
 * account mutation — identity/role/status mutations are NOT part of the
 * approved admin surface.
 */

import { Injectable, NotFoundException } from '@nestjs/common';

import { buildPageMeta } from '@khabir/shared-types';

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

  async listUsers(
    query: { page: number; limit: number; q?: string; role?: UserRole; status?: string },
  ): Promise<{ items: Array<Record<string, unknown>>; meta: ReturnType<typeof buildPageMeta> }> {
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
    const [profile, technicianProfile, merchantProfile, subscription, technicianServicesCount,
      productsCount, serviceRequestsCount] = await Promise.all([
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
      this.prisma.service.count(),
      this.prisma.product.count({ where: { merchant: { userId: id } } }),
      this.prisma.serviceRequest.count({ where: { OR: [{ customerId: id }, { technician: { userId: id } }] } }),
    ]);
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
}
