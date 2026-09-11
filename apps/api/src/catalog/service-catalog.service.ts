/**
 * Service/specialty catalog read API (Task 10E).
 * Source: docs/07_API.md §6 — GET /services returns ACTIVE service
 * categories. Required by technician profiles, discovery, and future
 * service requests. No pricing/rates are exposed (pricing semantics are
 * not approved — docs/06_DATABASE.md §9).
 */


import { buildPageMeta } from '@khabir/shared-types';
import { Injectable } from '@nestjs/common';


import { PrismaService } from '../database/prisma.service';

import type { ServiceDto } from '@khabir/shared-types';
import type { ServiceListQuery } from '@khabir/shared-validation';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ServiceListQuery,
  ): Promise<{ items: ServiceDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit, appliance_category_id, q } = query;
    const where: Prisma.ServiceWhereInput = {
      isActive: true,
      ...(appliance_category_id !== undefined
        ? { applianceCategoryId: appliance_category_id }
        : {}),
      ...(q !== undefined
        ? {
            OR: [{ nameAr: { contains: q } }, { descriptionAr: { contains: q } }],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          applianceCategoryId: true,
          nameAr: true,
          slug: true,
          descriptionAr: true,
        },
      }),
    ]);

    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }
}
