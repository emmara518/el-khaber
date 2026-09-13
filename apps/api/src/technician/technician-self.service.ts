/**
 * Technician self-service (Task 10J-R1).
 * Sources: docs/07_API.md §16, docs/09 §6, docs/06 §9–§10.
 *
 * Rules:
 * - Identity: JWT user → technician_profiles (resolved, lazily created on
 *   first GET so a brand-new technician can onboard).
 * - Editable fields NEVER include verificationStatus, ratings, counters,
 *   or completedServicesCount — Admin owns verification (docs/09 §6) and
 *   ratings are server-derived (docs/06 §27).
 * - Areas: label-only areas (from the onboarding preset list) are stored
 *   without coordinates (nullable since 10J-R1); entries WITH coordinates
 *   also derive PostGIS geography via the shared trigger (10E-R1).
 * - Services: technician_services joins against the documented services
 *   catalog; price_from optional; unique per (technician, service).
 * - No real-database reassignment or availability invention anywhere.
 */

import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';

import { ConflictException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';


import type {
  ServiceRequestListQuery,
  TechnicianProfileUpdateInput,
  TechnicianServiceAddInput,
} from '@khabir/shared-validation';
import type { Prisma } from '@prisma/client';

const SELF_PROFILE_SELECT = {
  id: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  verificationStatus: true,
  experienceYears: true,
  completedServicesCount: true,
  ratingAverage: true,
  ratingCount: true,
  availabilityStatus: true,
  services: {
    where: { isActive: true },
    select: {
      serviceId: true,
      priceFrom: true,
      service: {
        select: {
          id: true,
          nameAr: true,
          slug: true,
          applianceCategoryId: true,
        },
      },
    },
  },
  serviceAreas: { select: { labelAr: true, latitude: true, longitude: true } },
} satisfies Prisma.TechnicianProfileSelect;

type SelfRow = Prisma.TechnicianProfileGetPayload<{ select: typeof SELF_PROFILE_SELECT }>;

function toDto(row: SelfRow): Record<string, unknown> {
  return {
    id: row.id,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    verificationStatus: row.verificationStatus,
    experienceYears: row.experienceYears,
    completedServicesCount: row.completedServicesCount,
    ratingAverage: row.ratingAverage === null ? null : Number(row.ratingAverage),
    ratingCount: row.ratingCount,
    availabilityStatus: row.availabilityStatus,
    services: row.services.map((s) => ({
      serviceId: s.serviceId,
      nameAr: s.service.nameAr,
      slug: s.service.slug,
      applianceCategoryId: s.service.applianceCategoryId,
      priceFrom: s.priceFrom === null ? null : Number(s.priceFrom),
    })),
    areas: row.serviceAreas.map((a) => ({
      labelAr: a.labelAr,
      latitude: a.latitude === null ? null : Number(a.latitude),
      longitude: a.longitude === null ? null : Number(a.longitude),
    })),
  };
}

@Injectable()
export class TechnicianSelfService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves (lazily CREATES) the caller's technician profile. */
  private async resolveProfileId(userId: string): Promise<string> {
    const existing = await this.prisma.technicianProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (existing !== null) {
      return existing.id;
    }
    // Lazy onboarding bootstrap: registration creates the USER only.
    const created = await this.prisma.technicianProfile.create({
      data: { userId },
      select: { id: true },
    });
    return created.id;
  }

  async getProfile(userId: string): Promise<Record<string, unknown>> {
    const profileId = await this.resolveProfileId(userId);
    const row = await this.prisma.technicianProfile.findFirst({
      where: { id: profileId },
      select: SELF_PROFILE_SELECT,
    });
    if (row === null) {
      throw new NotFoundException('Technician profile not found');
    }
    return toDto(row);
  }

  async updateProfile(
    userId: string,
    input: TechnicianProfileUpdateInput,
  ): Promise<Record<string, unknown>> {
    const profileId = await this.resolveProfileId(userId);

    const data: Prisma.TechnicianProfileUpdateManyMutationInput = {
      ...(input.display_name !== undefined ? { displayName: input.display_name } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.avatar_url !== undefined ? { avatarUrl: input.avatar_url } : {}),
      ...(input.experience_years !== undefined ? { experienceYears: input.experience_years } : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.technicianProfile.update({ where: { id: profileId }, data });
      }
      if (input.areas !== undefined) {
        // Replace-set sync: delete labels the caller dropped, upsert the
        // caller's set (unique per technician+label protects against races).
        const desiredLabels = new Set(input.areas.map((a) => a.label_ar));
        const current = await tx.technicianServiceArea.findMany({
          where: { technicianId: profileId },
          select: { labelAr: true },
        });
        for (const existing of current) {
          if (!desiredLabels.has(existing.labelAr)) {
            await tx.technicianServiceArea.deleteMany({
              where: { technicianId: profileId, labelAr: existing.labelAr },
            });
          }
        }
        for (const area of input.areas) {
          const existingRow = await tx.technicianServiceArea.findFirst({
            where: { technicianId: profileId, labelAr: area.label_ar },
            select: { id: true },
          });
          if (existingRow === null) {
            await tx.technicianServiceArea.create({
              data: {
                technicianId: profileId,
                labelAr: area.label_ar,
                latitude: area.latitude ?? null,
                longitude: area.longitude ?? null,
              },
            });
          } else if (area.latitude !== undefined && area.longitude !== undefined) {
            await tx.technicianServiceArea.update({
              where: { id: existingRow.id },
              data: { latitude: area.latitude, longitude: area.longitude },
            });
          }
        }
      }
    });

    return this.getProfile(userId);
  }

  async listServicesForUser(userId: string): Promise<Array<Record<string, unknown>>> {
    const profileId = await this.resolveProfileId(userId);
    const rows = await this.prisma.technicianService.findMany({
      where: { technicianId: profileId },
      select: {
        serviceId: true,
        priceFrom: true,
        isActive: true,
        service: { select: { id: true, nameAr: true, slug: true, applianceCategoryId: true } },
      },
    });
    return rows.map((r) => ({
      serviceId: r.serviceId,
      nameAr: r.service.nameAr,
      slug: r.service.slug,
      applianceCategoryId: r.service.applianceCategoryId,
      priceFrom: r.priceFrom === null ? null : Number(r.priceFrom),
      isActive: r.isActive,
    }));
  }

  async addService(
    userId: string,
    input: TechnicianServiceAddInput,
  ): Promise<Record<string, unknown>> {
    const profileId = await this.resolveProfileId(userId);
    const service = await this.prisma.service.findFirst({
      where: { id: input.service_id },
      select: { id: true, isActive: true },
    });
    if (service === null) {
      throw new NotFoundException('Service not found');
    }
    const duplicate = await this.prisma.technicianService.findFirst({
      where: { technicianId: profileId, serviceId: input.service_id },
      select: { serviceId: true },
    });
    if (duplicate !== null) {
      throw new ConflictException('Service already added');
    }
    await this.prisma.technicianService.create({
      data: {
        technicianId: profileId,
        serviceId: input.service_id,
        priceFrom: input.price_from ?? null,
        isActive: true,
      },
    });
    return { serviceId: input.service_id, priceFrom: input.price_from ?? null, isActive: true };
  }

  async removeService(userId: string, serviceId: string): Promise<void> {
    const profileId = await this.resolveProfileId(userId);
    const removed = await this.prisma.technicianService.deleteMany({
      where: { technicianId: profileId, serviceId },
    });
    if (removed.count === 0) {
      throw new NotFoundException('Service not attached');
    }
  }

  async stats(userId: string): Promise<Record<string, unknown>> {
    const profileId = await this.resolveProfileId(userId);
    const [pendingCount, onTheWayCount, inProgressCount, completedCount, profile] =
      await Promise.all([
        this.prisma.serviceRequest.count({
          where: { technicianId: profileId, status: 'pending' },
        }),
        this.prisma.serviceRequest.count({
          where: { technicianId: profileId, status: 'on_the_way' },
        }),
        this.prisma.serviceRequest.count({
          where: { technicianId: profileId, status: 'in_progress' },
        }),
        this.prisma.serviceRequest.count({
          where: { technicianId: profileId, status: 'completed' },
        }),
        this.prisma.technicianProfile.findFirst({
          where: { id: profileId },
          select: { ratingAverage: true, ratingCount: true, completedServicesCount: true },
        }),
      ]);
    return {
      pendingCount,
      onTheWayCount,
      inProgressCount,
      completedCount,
      completedServicesCount: profile?.completedServicesCount ?? 0,
      ratingAverage: profile?.ratingAverage === null || profile?.ratingAverage === undefined
        ? null
        : Number(profile.ratingAverage),
      ratingCount: profile?.ratingCount ?? 0,
    };
  }

  /** GET /technician/requests — the documented alias of the role-scoped list. */
  async listRequests(
    userId: string,
    query: ServiceRequestListQuery,
  ): Promise<{
    items: Array<Record<string, unknown>>;
    meta: ReturnType<typeof buildPageMeta>;
  }> {
    const profileId = await this.resolveProfileId(userId);
    const where: Prisma.ServiceRequestWhereInput =
      query.status === undefined
        ? {
            OR: [
              { status: 'pending', technicianId: profileId },
              { technicianId: profileId, status: { not: 'pending' } },
            ],
          }
        : { status: query.status, technicianId: profileId };
    const [total, rows] = await Promise.all([
      this.prisma.serviceRequest.count({ where }),
      this.prisma.serviceRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          status: true,
          problemTitle: true,
          problemDescription: true,
          applianceCategoryId: true,
          serviceId: true,
          faultId: true,
          scheduledAt: true,
          createdAt: true,
        },
      }),
    ]);
    return { items: rows, meta: buildPageMeta(query.page, query.limit, total) };
  }
}
