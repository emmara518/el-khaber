/**
 * Appliance category read API (Task 10E).
 * Source: docs/07_API.md §6 — GET /appliance-categories lists ACTIVE
 * appliance categories. Reference data is database-backed (seeded
 * baseline: washing_machine, refrigerator, air_conditioner); nothing is
 * hard-coded in controllers.
 */

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { ApplianceCategoryDto } from '@khabir/shared-types';

/** Defensive cap for the unparameterized reference list. */
const MAX_CATEGORIES = 200;

@Injectable()
export class ApplianceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<ApplianceCategoryDto[]> {
    const rows = await this.prisma.applianceCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
      take: MAX_CATEGORIES,
      select: {
        id: true,
        nameAr: true,
        slug: true,
        iconUrl: true,
        imageUrl: true,
        sortOrder: true,
      },
    });
    return rows;
  }
}
