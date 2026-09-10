/**
 * Technician discovery read API (Task 10E).
 * Source: docs/07_API.md §6 (GET /technicians, GET /technicians/:id);
 * visibility rules from docs/06_DATABASE.md §10.
 *
 * Boundary decisions (documented, not invented):
 *   - ONLY verified technicians are publicly visible. Non-verified,
 *     suspended, or missing profiles all return the same 404 — no
 *     moderation state is exposed.
 *   - `sort` accepts only `rating` — a ranking signal explicitly
 *     documented in docs/06_DATABASE.md §10 (verification status,
 *     entitlements, rating). No invented ranking algorithm.
 *   - Geo params (lat/lng/radius) are documented in 07 but NOT
 *     implemented: the frozen 10B schema has no technician
 *     location/service-area model (DATABASE MODEL GAP reported to the
 *     CTO — a schema addition requires explicit approval).
 *   - Pricing (priceFrom) is not exposed: pricing semantics are not
 *     approved (docs/06_DATABASE.md §9).
 *   - Private data (userId, contact channels, admin notes) is never
 *     selected.
 */

import { Injectable, NotFoundException } from '@nestjs/common';

import { buildPageMeta } from '@khabir/shared-types';
import type { TechnicianListQuery } from '@khabir/shared-validation';

import { PrismaService } from '../database/prisma.service';

import type { TechnicianPublicDto } from '@khabir/shared-types';
import type { Prisma } from '@prisma/client';

const SERVICES_INCLUDE = {
  services: {
    where: { isActive: true },
    select: {
      service: {
        select: {
          id: true,
          applianceCategoryId: true,
          nameAr: true,
          slug: true,
          descriptionAr: true,
        },
      },
    },
  },
} satisfies Prisma.TechnicianProfileInclude;

type TechnicianWithServices = Prisma.TechnicianProfileGetPayload<{
  include: typeof SERVICES_INCLUDE;
}>;

function toPublicDto(row: TechnicianWithServices): TechnicianPublicDto {
  return {
    id: row.id,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    verificationStatus: row.verificationStatus,
    availabilityStatus: row.availabilityStatus,
    experienceYears: row.experienceYears,
    completedServicesCount: row.completedServicesCount,
    ratingAverage: row.ratingAverage === null ? null : Number(row.ratingAverage),
    ratingCount: row.ratingCount,
    services: row.services.map((s) => ({ service: s.service })),
  };
}

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: TechnicianListQuery,
  ): Promise<{ items: TechnicianPublicDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit, q, appliance_category_id, service_id, fault_id, rating_min, availability } =
      query;

    const serviceFilters: Prisma.TechnicianServiceWhereInput[] = [{ isActive: true }];
    if (service_id !== undefined) {
      serviceFilters.push({ serviceId: service_id });
    }
    if (appliance_category_id !== undefined) {
      serviceFilters.push({ service: { applianceCategoryId: appliance_category_id } });
    }
    if (fault_id !== undefined) {
      serviceFilters.push({ service: { faultLinks: { some: { faultId: fault_id } } } });
    }

    const where: Prisma.TechnicianProfileWhereInput = {
      verificationStatus: 'verified',
      ...(q !== undefined
        ? {
            OR: [
              { displayName: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(rating_min !== undefined ? { ratingAverage: { gte: rating_min } } : {}),
      ...(availability !== undefined ? { availabilityStatus: availability } : {}),
      services: { some: { AND: serviceFilters } },
    };

    const [total, rows] = await Promise.all([
      this.prisma.technicianProfile.count({ where }),
      this.prisma.technicianProfile.findMany({
        where,
        // `rating` is the only documented ranking signal (06 §10).
        // Stable id tiebreak keeps pagination deterministic.
        orderBy: [
          { ratingAverage: { sort: 'desc', nulls: 'last' } },
          { ratingCount: 'desc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: SERVICES_INCLUDE,
      }),
    ]);

    return { items: rows.map(toPublicDto), meta: buildPageMeta(page, limit, total) };
  }

  async detail(id: string): Promise<TechnicianPublicDto> {
    const row = await this.prisma.technicianProfile.findFirst({
      where: { id, verificationStatus: 'verified' },
      include: SERVICES_INCLUDE,
    });
    if (row === null) {
      // Missing, unverified, or suspended: identical 404 — moderation
      // state is never exposed.
      throw new NotFoundException('Technician not found');
    }
    return toPublicDto(row);
  }
}
