/**
 * Locations service (Task REM-001).
 * Source: docs/07_API.md §8, docs/06_DATABASE.md §6.
 *
 * User-owned location records. A service request requires a `location_id`
 * that references a location OWNED by the authenticated customer, so this
 * surface is what makes the customer request journey executable.
 *
 * Ownership is derived from the verified JWT subject; another account's
 * location is indistinguishable from a missing one (identical 404).
 * Coordinates are OPTIONAL (label/address-only locations are valid).
 */

import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';


import { PrismaService } from '../database/prisma.service';

import type { LocationDto } from '@khabir/shared-types';
import type { CreateLocationInput, UpdateLocationInput } from '@khabir/shared-validation';
import type { Prisma } from '@prisma/client';

const LOCATION_SELECT = {
  id: true,
  label: true,
  addressText: true,
  city: true,
  region: true,
  country: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LocationSelect;

type LocationRow = Prisma.LocationGetPayload<{ select: typeof LOCATION_SELECT }>;

function toDto(row: LocationRow): LocationDto {
  return {
    id: row.id,
    label: row.label,
    addressText: row.addressText,
    city: row.city,
    region: row.region,
    country: row.country,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: { page: number; limit: number },
  ): Promise<{ items: LocationDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.LocationWhereInput = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.location.count({ where }),
      this.prisma.location.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: LOCATION_SELECT,
      }),
    ]);
    return { items: rows.map(toDto), meta: buildPageMeta(page, limit, total) };
  }

  async create(userId: string, input: CreateLocationInput): Promise<LocationDto> {
    const row = await this.prisma.location.create({
      data: {
        userId,
        label: input.label,
        addressText: input.address_text ?? null,
        city: input.city ?? null,
        region: input.region ?? null,
        country: input.country ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
      select: LOCATION_SELECT,
    });
    return toDto(row);
  }

  async update(userId: string, id: string, input: UpdateLocationInput): Promise<LocationDto> {
    // Atomic ownership-scoped mutation. count=0 means not-found or not-owned
    // (identical 404 — no existence leak).
    const updated = await this.prisma.location.updateMany({
      where: { id, userId },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.address_text !== undefined ? { addressText: input.address_text } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.region !== undefined ? { region: input.region } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Location not found');
    }
    const row = await this.prisma.location.findFirst({
      where: { id, userId },
      select: LOCATION_SELECT,
    });
    if (row === null) {
      throw new NotFoundException('Location not found');
    }
    return toDto(row);
  }
}
