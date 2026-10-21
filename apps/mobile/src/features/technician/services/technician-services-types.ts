/**
 * Technician Services domain (T-F) — attach/detach the documented
 * catalog services (docs/07_API.md §16).
 *
 * A technician's attached services are the real `technician_services`
 * rows joined against the public services catalog. `priceFrom` is
 * server-owned and optional; the client never invents a price.
 */

export interface TechnicianAttachedService {
  readonly serviceId: string;
  readonly nameAr: string;
  readonly slug: string;
  readonly applianceCategoryId: string;
  readonly applianceNameAr: string;
  readonly priceFrom: number | null;
  readonly isActive: boolean;
}

export interface TechnicianServiceCatalogItem {
  readonly id: string;
  readonly nameAr: string;
  readonly slug: string;
  readonly applianceCategoryId: string;
  readonly applianceNameAr: string;
  readonly descriptionAr: string | null;
}

export interface TechnicianServicesDataSource {
  getAttached(input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianAttachedService>>;
  getCatalog(input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianServiceCatalogItem>>;
  addService(input: {
    role: 'technician';
    serviceId: string;
  }): Promise<void>;
  removeService(input: { role: 'technician'; serviceId: string }): Promise<void>;
}

/** Catalog entries not yet attached (pure, unit-testable). */
export function availableCatalogServices(
  catalog: ReadonlyArray<TechnicianServiceCatalogItem>,
  attached: ReadonlyArray<TechnicianAttachedService>,
): ReadonlyArray<TechnicianServiceCatalogItem> {
  const attachedIds = new Set(attached.map((s) => s.serviceId));
  return catalog.filter((s) => !attachedIds.has(s.id));
}

/** Map category ids to Arabic names where known (pure). */
export function applianceLabelMap(
  categories: ReadonlyArray<{ id: string; nameAr: string }>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(categories.map((c) => [c.id, c.nameAr]));
}
