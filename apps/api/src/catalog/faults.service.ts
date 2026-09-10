/**
 * Fault Guide content read API (Task 10E).
 * Source: docs/07_API.md §6, §8; Task 10E CTO decisions §6–§8.
 *
 * Publish-state boundary: ONLY `published` faults are customer-facing.
 * draft/review/archived content is indistinguishable from a missing
 * resource (404) — moderation state is never exposed. Guidance content
 * is advisory by contract (قد يكون...); the backend stores and serves
 * content verbatim and never generates diagnostic conclusions.
 */

import { Injectable, NotFoundException } from '@nestjs/common';

import { buildPageMeta } from '@khabir/shared-types';
import type { FaultListQuery } from '@khabir/shared-validation';

import { PrismaService } from '../database/prisma.service';

import type { FaultDto, FaultSummaryDto } from '@khabir/shared-types';
import type { Prisma } from '@prisma/client';

const LIST_SELECT = {
  id: true,
  applianceCategoryId: true,
  nameAr: true,
  slug: true,
  severityLevel: true,
  summaryAr: true,
  sortOrder: true,
} satisfies Prisma.FaultSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  guidanceAr: true,
  safetyNoteAr: true,
  whenToCallTechnicianAr: true,
  updatedAt: true,
} satisfies Prisma.FaultSelect;

@Injectable()
export class FaultsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: FaultListQuery): Promise<{ items: FaultSummaryDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit, appliance_category_id, q } = query;
    const where: Prisma.FaultWhereInput = {
      publishStatus: 'published',
      ...(appliance_category_id !== undefined ? { applianceCategoryId: appliance_category_id } : {}),
      ...(q !== undefined
        ? {
            OR: [{ nameAr: { contains: q } }, { summaryAr: { contains: q } }],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.fault.count({ where }),
      this.prisma.fault.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: LIST_SELECT,
      }),
    ]);

    return { items: rows, meta: buildPageMeta(page, limit, total) };
  }

  async detail(id: string): Promise<FaultDto> {
    // Publish-state boundary: a single query filters on the approved
    // publish state, so draft/review/archived content is indistinguishable
    // from a missing resource (same 404) and its moderation state is
    // never exposed.
    const row = await this.prisma.fault.findFirst({
      where: { id, publishStatus: 'published' },
      select: DETAIL_SELECT,
    });
    if (row === null) {
      throw new NotFoundException('Fault not found');
    }
    return { ...row, updatedAt: row.updatedAt.toISOString() };
  }
}
