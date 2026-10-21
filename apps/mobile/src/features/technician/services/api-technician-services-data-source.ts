/**
 * Real API `TechnicianServicesDataSource` (T-F).
 *
 * Endpoints (docs/07_API.md §16):
 * - GET    /technician/services       — attached services,
 * - POST   /technician/services       — attach a catalog service,
 * - DELETE /technician/services/:id   — detach,
 * - GET    /services                  — the public catalog to choose from.
 *
 * Mutations are single atomic writes; an already-attached service
 * returns 409, a missing one 404. No price is invented client-side.
 */

import { getApi } from '../../../lib/api-client';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { getApplianceCategories } from '../../../lib/catalog-reference';

import type {
  TechnicianAttachedService,
  TechnicianServiceCatalogItem,
  TechnicianServicesDataSource,
} from './technician-services-types';
import type { ServiceDto, TechnicianSelfService } from '@khabir/shared-types';

export type TechnicianServiceErrorCode = 'CONFLICT' | 'NOT_FOUND' | 'FAILED';

export class TechnicianServiceError extends Error {
  public readonly code: TechnicianServiceErrorCode;
  constructor(code: TechnicianServiceErrorCode, message?: string) {
    super(message ?? 'تعذر تنفيذ الإجراء على الخدمة');
    this.name = 'TechnicianServiceError';
    this.code = code;
  }
}

async function applianceLabels(): Promise<ReadonlyMap<string, string>> {
  const categories = await getApplianceCategories();
  return new Map(categories.map((c) => [c.id, c.nameAr]));
}

function toAttached(dto: TechnicianSelfService, labels: ReadonlyMap<string, string>): TechnicianAttachedService {
  return {
    serviceId: dto.serviceId,
    nameAr: dto.nameAr,
    slug: dto.slug,
    applianceCategoryId: dto.applianceCategoryId,
    applianceNameAr: labels.get(dto.applianceCategoryId) ?? '',
    priceFrom: dto.priceFrom,
    isActive: dto.isActive,
  };
}

function toCatalogItem(dto: ServiceDto, labels: ReadonlyMap<string, string>): TechnicianServiceCatalogItem {
  return {
    id: dto.id,
    nameAr: dto.nameAr,
    slug: dto.slug,
    applianceCategoryId: dto.applianceCategoryId,
    applianceNameAr: labels.get(dto.applianceCategoryId) ?? '',
    descriptionAr: dto.descriptionAr,
  };
}

export class ApiTechnicianServicesDataSource implements TechnicianServicesDataSource {
  async getAttached(_input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianAttachedService>> {
    const [res, labels] = await Promise.all([
      getApi().request<TechnicianSelfService[]>('GET', '/technician/services'),
      applianceLabels(),
    ]);
    return res.data.map((dto) => toAttached(dto, labels));
  }

  async getCatalog(_input: { role: 'technician' }): Promise<ReadonlyArray<TechnicianServiceCatalogItem>> {
    const [items, labels] = await Promise.all([
      drainPages<ServiceDto>((page, limit) =>
        getApi()
          .request<ServiceDto[]>('GET', `/services${buildQuery({ page, limit })}`, undefined, { auth: false })
          .then((res) => ({ items: res.data, meta: res.meta })),
      ),
      applianceLabels(),
    ]);
    return items.map((dto) => toCatalogItem(dto, labels));
  }

  async addService(input: { role: 'technician'; serviceId: string }): Promise<void> {
    try {
      await getApi().request('POST', '/technician/services', { service_id: input.serviceId });
    } catch (err: unknown) {
      throw toServiceError(err);
    }
  }

  async removeService(input: { role: 'technician'; serviceId: string }): Promise<void> {
    try {
      await getApi().request(
        'DELETE',
        `/technician/services/${encodeURIComponent(input.serviceId)}`,
      );
    } catch (err: unknown) {
      throw toServiceError(err);
    }
  }
}

function toServiceError(err: unknown): TechnicianServiceError {
  const status = (err as { status?: number }).status;
  if (status === 409) {
    return new TechnicianServiceError('CONFLICT', 'هذه الخدمة مضافة بالفعل إلى ملفك.');
  }
  if (status === 404) {
    return new TechnicianServiceError('NOT_FOUND', 'لم يتم العثور على هذه الخدمة.');
  }
  return new TechnicianServiceError('FAILED', 'تعذر تحديث خدماتك. حاول مرة أخرى.');
}
