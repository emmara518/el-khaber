/**
 * Public store product read service (Phase D).
 *
 * Visibility: only `status = 'active'` products are publicly readable. This
 * reuses the EXISTING product lifecycle (active | suspended — docs/06 §21,
 * docs/07 §17); no approval/moderation/publishing system is introduced.
 * A merchant-created active product is therefore publicly readable.
 *
 * Exposes a minimal public read model: no inventory, no merchant contact
 * data, no internal auth fields.
 */

import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { PublicProductDto } from './types';
import type { Prisma } from '@prisma/client';

const PUBLIC_PRODUCT_SELECT = {
  id: true,
  nameAr: true,
  slug: true,
  descriptionAr: true,
  price: true,
  imageUrl: true,
  merchant: { select: { businessName: true } },
} satisfies Prisma.ProductSelect;

type PublicProductRow = Prisma.ProductGetPayload<{ select: typeof PUBLIC_PRODUCT_SELECT }>;

function toPublicDto(row: PublicProductRow): PublicProductDto {
  return {
    id: row.id,
    nameAr: row.nameAr,
    slug: row.slug,
    descriptionAr: row.descriptionAr,
    price: row.price === null ? null : Number(row.price),
    imageUrl: row.imageUrl,
    merchant: { businessNameAr: row.merchant.businessName },
  };
}

@Injectable()
export class StoreProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page: number;
    limit: number;
  }): Promise<{ items: PublicProductDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.ProductWhereInput = { status: 'active' };
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: PUBLIC_PRODUCT_SELECT,
      }),
    ]);
    return { items: rows.map(toPublicDto), meta: buildPageMeta(page, limit, total) };
  }

  async detail(id: string): Promise<PublicProductDto> {
    const row = await this.prisma.product.findFirst({
      where: { id, status: 'active' },
      select: PUBLIC_PRODUCT_SELECT,
    });
    if (row === null) {
      // Not-found and not-publicly-visible return the identical response.
      throw new NotFoundException('Product not found');
    }
    return toPublicDto(row);
  }
}
