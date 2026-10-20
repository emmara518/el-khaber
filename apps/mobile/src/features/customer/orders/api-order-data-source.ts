/**
 * Real API `OrderDataSource` (Task 10J) — order tracking detail.
 *
 * Replaces the Batch-E mock behind the SAME interface.
 * Endpoints: GET /service-requests/:id (role-scoped detail with the
 * bounded append-only history), public GET /technicians/:id for the
 * assigned technician's display name, and the public appliance
 * categories reference for the appliance label.
 *
 * Normalization (docs/07 §7):
 * - the timeline is built from the REAL status history (each record's
 *   `toStatus` + `createdAt`); absent transitions render without a
 *   timestamp — never invented,
 * - 404 → `null` → the existing safe "missing" state,
 * - `appointmentAr` comes from the real `scheduledAt`.
 *
 * Source: docs/07_API.md §7, §13.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { categoryNameAr, getTechnicianPublic } from '../../../lib/catalog-reference';
import {
  initialsOf,
  REQUEST_STATUS_LABELS_AR,
  TECHNICIAN_NAME_FALLBACK_AR,
} from '../../../lib/request-labels';

import { buildTimeline, type OrderDataSource, type OrderDetail, type OrderPhoto } from './order-detail-types';

import type { CustomerRequestStatus } from '../requests/customer-requests-types';
import type {
  ServiceRequestDto,
  ServiceRequestMediaDto,
  ServiceRequestMediaUrlDto,
} from '@khabir/shared-types';

/** Cap thumbnails on the tracking screen; the API returns the full list. */
const PHOTO_PREVIEW_MAX = 8;

async function loadOrderPhotos(requestId: string): Promise<{
  photos: ReadonlyArray<OrderPhoto>;
  photosUnavailable: boolean;
}> {
  let items: ReadonlyArray<ServiceRequestMediaDto>;
  try {
    const res = await getApi().request<ServiceRequestMediaDto[]>(
      'GET',
      `/service-requests/${encodeURIComponent(requestId)}/media`,
    );
    items = res.data;
  } catch {
    // Could not check — report unavailable instead of faking "no photos".
    return { photos: [], photosUnavailable: true };
  }
  const photos = await Promise.all(
    items.slice(0, PHOTO_PREVIEW_MAX).map(async (item): Promise<OrderPhoto> => {
      let url: string | null = null;
      try {
        const grant = await getApi().request<ServiceRequestMediaUrlDto>(
          'GET',
          `/service-requests/${encodeURIComponent(requestId)}/media/${encodeURIComponent(item.id)}/url`,
        );
        url = grant.data.downloadUrl;
      } catch {
        url = null;
      }
      return {
        id: item.id,
        mimeType: item.mimeType,
        createdAtAr: formatArDateTime(item.createdAt),
        url,
      };
    }),
  );
  return { photos, photosUnavailable: false };
}

/** Real history records → timeline timestamp map (status → formatted). */
function timestampsFromHistory(dto: ServiceRequestDto): Partial<Record<CustomerRequestStatus, string>> {
  const map: Partial<Record<CustomerRequestStatus, string>> = {};
  for (const record of dto.history) {
    if (map[record.toStatus] === undefined) {
      map[record.toStatus] = formatArDateTime(record.createdAt);
    }
  }
  return map;
}

export async function mapOrderDetail(dto: ServiceRequestDto): Promise<OrderDetail> {
  const applianceAr = await categoryNameAr(dto.applianceCategoryId);
  let technicianNameAr: string;
  let technicianInitialsAr: string;
  if (dto.technicianId === null) {
    technicianNameAr = 'بانتظار تعيين فني';
    technicianInitialsAr = '؟';
  } else {
    const tech = await getTechnicianPublic(dto.technicianId);
    const name = tech?.displayName ?? TECHNICIAN_NAME_FALLBACK_AR;
    technicianNameAr = name;
    technicianInitialsAr = initialsOf(name);
  }
  const locationParts = [dto.location.label, dto.location.city, dto.location.addressText]
    .filter((part): part is string => part !== null && part.trim().length > 0);
  const taskAr =
    (dto.problemTitle ?? dto.problemDescription ?? '').trim().length > 0
      ? (dto.problemTitle ?? dto.problemDescription ?? '').trim()
      : applianceAr;
  const { photos, photosUnavailable } = await loadOrderPhotos(dto.id);
  return {
    requestId: dto.id,
    technicianId: dto.technicianId,
    technicianNameAr,
    technicianInitialsAr,
    applianceAr,
    taskAr,
    status: dto.status,
    statusLabelAr: REQUEST_STATUS_LABELS_AR[dto.status],
    locationAr: locationParts.join(' – '),
    appointmentAr: dto.scheduledAt !== null ? formatArDateTime(dto.scheduledAt) : null,
    timeline: buildTimeline(dto.status, timestampsFromHistory(dto)),
    photos,
    photosUnavailable,
  };
}

export class ApiOrderDataSource implements OrderDataSource {
  async getOrderDetail(input: { role: 'customer'; requestId: string }): Promise<OrderDetail | null> {
    void input.role;
    try {
      const res = await getApi().request<ServiceRequestDto>(
        'GET',
        `/service-requests/${input.requestId}`,
      );
      return await mapOrderDetail(res.data);
    } catch (err: unknown) {
      // 404 (missing OR not visible to this account — identical by
      // contract) maps to the safe missing state, never to an error.
      if (err instanceof Error && 'status' in err && (err as { status?: number }).status === 404) {
        return null;
      }
      throw err;
    }
  }
}
