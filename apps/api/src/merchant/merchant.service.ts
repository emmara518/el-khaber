/**
 * Merchant profile service (Task 10G).
 * Source: docs/07_API.md §17, docs/06_DATABASE.md.
 *
 * Identity: JWT user → merchant_profiles (via userId). The client never
 * supplies a merchant id. Onboarding = PATCH creating the profile when
 * absent. verificationStatus is READ-ONLY for merchants — docs/09_ADMIN.md
 * makes admin the sole verification authority, and no verification
 * mutation endpoint is documented for merchants (none is created).
 */

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { MerchantProfileDto, MerchantProfileUpdateInput } from './types';


@Injectable()
export class MerchantProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveMerchantProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.merchantProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  private toDto(row: {
    id: string;
    businessName: string | null;
    bio: string | null;
    logoUrl: string | null;
    contactPhone: string | null;
    locationId: string | null;
    verificationStatus: string;
    createdAt: Date;
    updatedAt: Date;
  }): MerchantProfileDto {
    return {
      id: row.id,
      businessName: row.businessName,
      bio: row.bio,
      logoUrl: row.logoUrl,
      contactPhone: row.contactPhone,
      locationId: row.locationId,
      verificationStatus: row.verificationStatus as MerchantProfileDto['verificationStatus'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getProfile(userId: string): Promise<MerchantProfileDto> {
    const row = await this.prisma.merchantProfile.findFirst({
      where: { userId },
    });
    if (row === null) {
      // Not onboarded yet — PATCH /merchant/profile creates it.
      throw new NotFoundException('Merchant profile not found');
    }
    return this.toDto(row);
  }

  async updateProfile(userId: string, input: MerchantProfileUpdateInput): Promise<MerchantProfileDto> {
    // Location context: must reference a location OWNED by this merchant.
    if (input.locationId !== undefined) {
      const owned = await this.prisma.location.findFirst({
        where: { id: input.locationId, userId },
        select: { id: true },
      });
      if (owned === null) {
        throw new NotFoundException('Location not found');
      }
    }

    const existing = await this.prisma.merchantProfile.findFirst({ where: { userId } });
    const data = {
      ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.locationId !== undefined ? { locationId: input.locationId } : {}),
    };

    if (existing === null) {
      // Onboarding persistence: incomplete profile → submitted for review.
      // verificationStatus stays 'pending' (admin approves later).
      const created = await this.prisma.merchantProfile.create({
        data: { userId, ...data },
      });
      return this.toDto(created);
    }

    await this.prisma.merchantProfile.updateMany({
      where: { id: existing.id, userId },
      data,
    });
    const updated = await this.prisma.merchantProfile.findFirst({ where: { userId } });
    if (updated === null) {
      throw new NotFoundException('Merchant profile not found');
    }
    return this.toDto(updated);
  }
}
