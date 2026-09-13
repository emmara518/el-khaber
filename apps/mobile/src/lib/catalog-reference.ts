/**
 * Shared reference-data caches for API adapters (Task 10J).
 *
 * Several screen models need server reference data that the API
 * exposes as separate public endpoints (appliance categories,
 * technician public profiles). Adapters normalize naming at the
 * boundary — raw DTO ids are never mapped into JSX. Caches are
 * request-scoped singletons with stable promises so parallel
 * adapters/screens never duplicate the same GET (§38 performance).
 */

import { getApi } from './api-client';

import type { ApplianceCategoryDto, TechnicianPublicDto } from '@khabir/shared-types';

// -----------------------------------------------------------------------------
// Appliance categories (public GET /appliance-categories)
// -----------------------------------------------------------------------------

let categoriesPromise: Promise<readonly ApplianceCategoryDto[]> | null = null;

export function getApplianceCategories(): Promise<readonly ApplianceCategoryDto[]> {
  if (categoriesPromise === null) {
    categoriesPromise = getApi()
      .request<readonly ApplianceCategoryDto[]>('GET', '/appliance-categories', undefined, {
        auth: false,
      })
      .then((res) => res.data)
      .catch((err: unknown) => {
        categoriesPromise = null; // allow retry on next call
        throw err;
      });
  }
  return categoriesPromise;
}

/** Category id → Arabic display name ('' when unknown). */
export async function categoryNameAr(id: string): Promise<string> {
  const categories = await getApplianceCategories();
  return categories.find((c) => c.id === id)?.nameAr ?? '';
}

/** Category id → canonical slug (null when unknown). */
export async function categorySlugById(id: string): Promise<string | null> {
  const categories = await getApplianceCategories();
  return categories.find((c) => c.id === id)?.slug ?? null;
}

/** Canonical slug → category id (null when unknown). */
export async function categoryIdBySlug(slug: string): Promise<string | null> {
  const categories = await getApplianceCategories();
  return categories.find((c) => c.slug === slug)?.id ?? null;
}

// -----------------------------------------------------------------------------
// Technician public profiles (public GET /technicians/:id)
// -----------------------------------------------------------------------------

const technicianCache = new Map<string, Promise<TechnicianPublicDto | null>>();

/**
 * Public technician profile by id. A missing/unverified technician is
 * indistinguishable from a missing resource server-side (identical
 * 404) — both resolve to `null` here.
 */
export function getTechnicianPublic(id: string): Promise<TechnicianPublicDto | null> {
  const cached = technicianCache.get(id);
  if (cached !== undefined) return cached;
  const promise = getApi()
    .request<TechnicianPublicDto>('GET', `/technicians/${id}`, undefined, { auth: false })
    .then((res) => res.data)
    .catch(() => null); // 404/401/network → absent profile (display fallback)
  technicianCache.set(id, promise);
  return promise;
}
