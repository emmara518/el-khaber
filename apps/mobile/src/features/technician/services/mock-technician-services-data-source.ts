/**
 * Deterministic mock `TechnicianServicesDataSource` (T-F).
 *
 * In-memory attached set seeded from a fixed catalog. Used by the spec
 * suite to exercise add / remove / conflict / failure paths without the
 * real API. The shipped screen uses `ApiTechnicianServicesDataSource`.
 */

import { TechnicianServiceError } from './api-technician-services-data-source';

import type {
  TechnicianAttachedService,
  TechnicianServiceCatalogItem,
  TechnicianServicesDataSource,
} from './technician-services-types';

const CATALOG: ReadonlyArray<TechnicianServiceCatalogItem> = [
  { id: 'svc-ac', nameAr: 'صيانة المكيفات', slug: 'ac-maintenance', applianceCategoryId: 'cat-ac', applianceNameAr: 'تكييفات', descriptionAr: null },
  { id: 'svc-filter', nameAr: 'تنظيف الفلاتر', slug: 'filter-clean', applianceCategoryId: 'cat-ac', applianceNameAr: 'تكييفات', descriptionAr: null },
  { id: 'svc-wm', nameAr: 'إصلاح الغسالات', slug: 'wm-repair', applianceCategoryId: 'cat-wm', applianceNameAr: 'غسالات', descriptionAr: null },
  { id: 'svc-fridge', nameAr: 'فحص تبريد الثلاجات', slug: 'fridge-cooling', applianceCategoryId: 'cat-fridge', applianceNameAr: 'ثلاجات', descriptionAr: null },
];

export interface MockTechnicianServicesOptions {
  /** Catalog service ids attached at construction. */
  attached?: ReadonlyArray<string>;
  /** Every mutation throws FAILED. */
  failing?: boolean;
}

export class MockTechnicianServicesDataSource implements TechnicianServicesDataSource {
  private readonly attachedIds: Set<string>;
  private readonly failing: boolean;

  constructor(options: MockTechnicianServicesOptions = {}) {
    this.attachedIds = new Set(options.attached ?? ['svc-ac']);
    this.failing = options.failing ?? false;
  }

  private attachedModels(): ReadonlyArray<TechnicianAttachedService> {
    return CATALOG.filter((c) => this.attachedIds.has(c.id)).map((c) => ({
      serviceId: c.id,
      nameAr: c.nameAr,
      slug: c.slug,
      applianceCategoryId: c.applianceCategoryId,
      applianceNameAr: c.applianceNameAr,
      priceFrom: null,
      isActive: true,
    }));
  }

  async getAttached(_input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianAttachedService>> {
    return this.attachedModels();
  }

  async getCatalog(_input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianServiceCatalogItem>> {
    return CATALOG;
  }

  async addService(input: { role: 'technician'; serviceId: string }): Promise<void> {
    if (this.failing) throw new TechnicianServiceError('FAILED');
    if (this.attachedIds.has(input.serviceId)) {
      throw new TechnicianServiceError('CONFLICT', 'هذه الخدمة مضافة بالفعل إلى ملفك.');
    }
    if (!CATALOG.some((c) => c.id === input.serviceId)) {
      throw new TechnicianServiceError('NOT_FOUND', 'لم يتم العثور على هذه الخدمة.');
    }
    this.attachedIds.add(input.serviceId);
  }

  async removeService(input: { role: 'technician'; serviceId: string }): Promise<void> {
    if (this.failing) throw new TechnicianServiceError('FAILED');
    if (!this.attachedIds.has(input.serviceId)) {
      throw new TechnicianServiceError('NOT_FOUND', 'لم يتم العثور على هذه الخدمة.');
    }
    this.attachedIds.delete(input.serviceId);
  }
}
