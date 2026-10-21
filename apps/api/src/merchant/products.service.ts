/**
 * Merchant product catalog service (Task 10G).
 * Source: docs/07_API.md §17, docs/06_DATABASE.md §21.
 *
 * Ownership: every query is scoped by the merchant profile derived from
 * the JWT — another merchant's products are indistinguishable from
 * missing ones (identical 404). Status values are exactly
 * active | suspended; transitions between them are unconstrained by the
 * contract, so the server validates the VALUE (no invented state graph).
 * price stays nullable with no currency/discount/tax semantics.
 * DELETE is documented in 07 §17 and performs a permanent removal.
 */


import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';


import { ConflictException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

import type { MerchantProductDto } from './types';
import type { MerchantProductCreateInput, MerchantProductUpdateInput } from '@khabir/shared-validation';
import type { Prisma } from '@prisma/client';

const PRODUCT_SELECT = {
  id: true,
  merchantId: true,
  nameAr: true,
  slug: true,
  descriptionAr: true,
  price: true,
  stockQuantity: true,
  imageUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

function toDto(row: ProductRow): MerchantProductDto {
  return {
    id: row.id,
    merchantId: row.merchantId,
    nameAr: row.nameAr,
    slug: row.slug,
    descriptionAr: row.descriptionAr,
    price: row.price === null ? null : Number(row.price),
    stockQuantity: row.stockQuantity,
    imageUrl: row.imageUrl,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugify(nameAr: string): string {
  return nameAr.trim().replace(/\s+/gu, '-').slice(0, 120) || 'product';
}

@Injectable()
export class MerchantProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveMerchantProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.merchantProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  async list(
    merchantId: string,
    query: { page: number; limit: number },
  ): Promise<{ items: MerchantProductDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.ProductWhereInput = { merchantId };
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: PRODUCT_SELECT,
      }),
    ]);
    return { items: rows.map(toDto), meta: buildPageMeta(page, limit, total) };
  }

  async detail(merchantId: string, id: string): Promise<MerchantProductDto> {
    const row = await this.prisma.product.findFirst({
      where: { id, merchantId },
      select: PRODUCT_SELECT,
    });
    if (row === null) {
      throw new NotFoundException('Product not found');
    }
    return toDto(row);
  }

  private async uniqueSlugFor(merchantId: string, desired: string, excludeId?: string): Promise<string> {
    let candidate = desired;
    for (let suffix = 0; suffix < 50; suffix += 1) {
      const clash = await this.prisma.product.findFirst({
        where: { merchantId, slug: candidate },
        select: { id: true },
      });
      if (clash === null || clash.id === excludeId) {
        return candidate;
      }
      candidate = `${desired}-${suffix + 2}`;
    }
    throw new ConflictException('Slug could not be generated');
  }

  async create(merchantId: string, input: MerchantProductCreateInput): Promise<MerchantProductDto> {
    // An EXPLICIT slug is user intent: a clash is a conflict. A DERIVED
    // slug (from nameAr) is uniquified automatically.
    if (input.slug !== undefined) {
      const clash = await this.prisma.product.findFirst({
        where: { merchantId, slug: input.slug },
        select: { id: true },
      });
      if (clash !== null) {
        throw new ConflictException('Slug already in use');
      }
    }
    const slug = await this.uniqueSlugFor(merchantId, input.slug ?? slugify(input.nameAr));
    const row = await this.prisma.product.create({
      data: {
        merchantId,
        nameAr: input.nameAr,
        slug,
        descriptionAr: input.descriptionAr ?? null,
        price: input.price ?? null,
        stockQuantity: input.stockQuantity ?? null,
        imageUrl: input.imageUrl ?? null,
        status: input.status ?? 'active',
      },
      select: PRODUCT_SELECT,
    });
    return toDto(row);
  }

  async update(
    merchantId: string,
    id: string,
    input: MerchantProductUpdateInput,
  ): Promise<MerchantProductDto> {
    if (input.slug !== undefined) {
      const clash = await this.prisma.product.findFirst({
        where: { merchantId, slug: input.slug },
        select: { id: true },
      });
      if (clash !== null && clash.id !== id) {
        throw new ConflictException('Slug already in use');
      }
    }

    // Atomic ownership-scoped mutation (Task 10F pattern): the loser of a
    // concurrent delete/transfer receives count=0 → identical 404.
    const updated = await this.prisma.product.updateMany({
      where: { id, merchantId },
      data: {
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.descriptionAr !== undefined ? { descriptionAr: input.descriptionAr } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Product not found');
    }
    const row = await this.prisma.product.findFirst({
      where: { id, merchantId },
      select: PRODUCT_SELECT,
    });
    if (row === null) {
      throw new NotFoundException('Product not found');
    }
    return toDto(row);
  }

  async remove(merchantId: string, id: string): Promise<void> {
    // Documented in docs/07_API.md §17: permanent deletion, ownership-scoped.
    const removed = await this.prisma.product.deleteMany({
      where: { id, merchantId },
    });
    if (removed.count === 0) {
      throw new NotFoundException('Product not found');
    }
  }
}
