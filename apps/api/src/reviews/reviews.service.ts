/**
 * Reviews service (Task 10H). Source: docs/07_API.md §10; docs/06 §14.
 *
 * Eligibility (documented): the request's customer owner, after the
 * request reached `completed`, one review per request (unique constraint
 * + pre-check → 409). Rating is 1–5 (zod + DB CHECK). Tags must reference
 * seeded/documented review tags — arbitrary client-created tags are not
 * supported. The technician's ratingAverage/ratingCount are
 * server-authoritative derived metrics recomputed on creation (06 §27).
 *
 * Public list (GET /technicians/:id/reviews) exposes only documented
 * public fields — no customer identifiers, no moderation state.
 */

import { Injectable } from '@nestjs/common';

import { buildPageMeta } from '@khabir/shared-types';
import type { CreateReviewInput } from '@khabir/shared-validation';

import { PrismaService } from '../database/prisma.service';
import { ConflictException, InvalidStateTransitionException, NotFoundException } from '../common/errors';

import type { ReviewSummaryDto } from '@khabir/shared-types';
import type { Prisma } from '@prisma/client';


const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  tagAssignments: {
    select: { tag: { select: { labelAr: true } } },
  },
} satisfies Prisma.ReviewSelect;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof REVIEW_SELECT }>;

function toPublicDto(row: ReviewRow): ReviewSummaryDto {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    tags: row.tagAssignments.map((a) => a.tag.labelAr),
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    customerId: string,
    requestId: string,
    input: CreateReviewInput,
  ): Promise<ReviewSummaryDto> {
    // Ownership: only the request's customer may review it.
    const request = await this.prisma.serviceRequest.findFirst({
      where: { id: requestId, customerId },
      select: { id: true, technicianId: true, status: true },
    });
    if (request === null) {
      throw new NotFoundException('Service request not found');
    }
    // Eligibility (documented): after completion only.
    if (request.status !== 'completed') {
      throw new InvalidStateTransitionException('Review requires a completed service request');
    }
    // Duplicate prevention: DB unique constraint + explicit pre-check.
    const duplicate = await this.prisma.review.findFirst({
      where: { serviceRequestId: requestId },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new ConflictException('Review already exists for this request');
    }
    if (request.technicianId === null) {
      // A completed request always has a technician; defensive only.
      throw new NotFoundException('Service request not found');
    }

    // Tags must reference seeded/documented review tags.
    if (input.tag_ids !== undefined && input.tag_ids.length > 0) {
      const tags = await this.prisma.reviewTag.findMany({
        where: { id: { in: input.tag_ids } },
        select: { id: true },
      });
      if (tags.length !== input.tag_ids.length) {
        throw new NotFoundException('Review tag not found');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          serviceRequestId: requestId,
          customerId,
          technicianId: request.technicianId as string,
          rating: input.rating,
          comment: input.comment ?? null,
        },
        select: { id: true },
      });
      if (input.tag_ids !== undefined) {
        for (const tagId of input.tag_ids) {
          await tx.reviewTagAssignment.create({
            data: { reviewId: review.id, tagId },
          });
        }
      }
      // Server-authoritative derived metrics (docs/06 §27).
      const ratings = await tx.review.findMany({
        where: { technicianId: request.technicianId as string },
        select: { rating: true },
      });
      const count = ratings.length;
      const average = ratings.reduce((sum, r) => sum + r.rating, 0) / count;
      await tx.technicianProfile.update({
        where: { id: request.technicianId as string },
        data: { ratingAverage: Math.round(average * 100) / 100, ratingCount: count },
      });
      return review;
    });

    const row = await this.prisma.review.findFirstOrThrow({
      where: { id: created.id },
      select: REVIEW_SELECT,
    });
    return toPublicDto(row);
  }

  /** Public reviews for technician discovery (docs/07 §6). */
  async listForTechnician(
    technicianProfileId: string,
    query: { page: number; limit: number },
  ): Promise<{ items: ReviewSummaryDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    // The technician must be publicly visible for their reviews to be.
    const profile = await this.prisma.technicianProfile.findFirst({
      where: { id: technicianProfileId, verificationStatus: 'verified' },
      select: { id: true },
    });
    if (profile === null) {
      throw new NotFoundException('Technician not found');
    }
    const { page, limit } = query;
    const where: Prisma.ReviewWhereInput = { technicianId: technicianProfileId };
    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: REVIEW_SELECT,
      }),
    ]);
    return { items: rows.map(toPublicDto), meta: buildPageMeta(page, limit, total) };
  }
}
