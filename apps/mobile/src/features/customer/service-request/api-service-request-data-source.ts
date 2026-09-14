/**
 * Real API `ServiceRequestDataSource` (Task 10J) — request creation.
 *
 * Endpoints (docs/07 §6/§7):
 * - form problems: GET /faults (published-only; the customer-visible
 *   fault-guide source of truth),
 * - submission: POST /service-requests (customer-only; identity and
 *   lifecycle are server-owned).
 *
 * Locations (Task REM-001): the customer's owned locations are read from
 * GET /locations and created through POST /locations, so the request
 * journey is executable end-to-end (a request requires an owned
 * `location_id`). No mock fallback: a failed location call surfaces an
 * honest error.
 *
 * REMAINING CONTRACT GAPS (reported — NOT invented around):
 * - Appointment slots: no slot inventory API exists; the step stays
 *   on its documented "coordinate by phone" (optional) semantics and
 *   omits `scheduled_at`.
 * - `service_id`: the request form does not select a service entry
 *   (the fault already links services server-side), so it is omitted.
 */

import { getApi } from '../../../lib/api-client';
import { toUserMessage } from '../../../lib/api-error';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import {
  categoryIdBySlug,
  getApplianceCategories,
} from '../../../lib/catalog-reference';

import {
  ServiceRequestSubmissionError,
  type ServiceRequestDataSource,
  type ServiceRequestFormData,
  type ServiceRequestSubmission,
} from './mock-service-request-data-source';

import type {
  AppointmentSlot,
  ProblemOption,
  RequestLocation,
  ServiceRequestDraft,
} from './service-request-types';
import type { FaultSummaryDto, LocationDto } from '@khabir/shared-types';

export { ServiceRequestSubmissionError };
export type {
  ServiceRequestDataSource,
  ServiceRequestFormData,
  ServiceRequestSubmission,
} from './mock-service-request-data-source';

const SUBMIT_FALLBACK_AR = 'فشل إرسال الطلب. تحقق من الاتصال وحاول مجددًا';
const LOCATION_MISSING_AR = 'اختر موقع تقديم الخدمة أو أضف موقعًا جديدًا';
const LOCATION_LOAD_FALLBACK_AR = 'تعذر تحميل المواقع. تحقق من الاتصال وحاول مجددًا';
const LOCATION_CREATE_FALLBACK_AR = 'تعذر حفظ الموقع. تحقق من الاتصال وحاول مجددًا';

/** Maps a backend LocationDto → the form's RequestLocation shape. */
export function mapLocation(dto: LocationDto, isDefault: boolean): RequestLocation {
  const detailParts = [dto.addressText, dto.city, dto.region].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  return {
    id: dto.id,
    labelAr: dto.label ?? 'موقع',
    detailAr: detailParts.length > 0 ? detailParts.join('، ') : '—',
    isDefault,
  };
}

/** Published faults → the form's predefined problem options. */
export async function mapProblemOptions(): Promise<ReadonlyArray<ProblemOption>> {
  const [faults, categories] = await Promise.all([
    drainPages<FaultSummaryDto>((page, limit) =>
      getApi()
        .request<FaultSummaryDto[]>(
          'GET',
          `/faults${buildQuery({ page, limit })}`,
          undefined,
          { auth: false },
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    ),
    getApplianceCategories(),
  ]);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const options: ProblemOption[] = [];
  for (const fault of faults) {
    const slug = slugById.get(fault.applianceCategoryId);
    if (slug !== 'washing_machine' && slug !== 'refrigerator' && slug !== 'air_conditioner') {
      continue; // unknown appliance — outside the home-appliance domain
    }
    options.push({ id: fault.id, applianceSlug: slug, titleAr: fault.nameAr });
  }
  return options;
}

export class ApiServiceRequestDataSource implements ServiceRequestDataSource {
  async getFormData(_input: { role: 'customer' }): Promise<ServiceRequestFormData> {
    const [problems, locations] = await Promise.all([mapProblemOptions(), this.loadLocations()]);
    return {
      problems,
      locations,
      // CONTRACT GAP: no appointment-slot inventory exists; the
      // "coordinate by phone" choice remains the valid default.
      slots: [] as ReadonlyArray<AppointmentSlot>,
    };
  }

  /** Reads the customer's owned locations (real API). */
  private async loadLocations(): Promise<ReadonlyArray<RequestLocation>> {
    try {
      const items = await drainPages<LocationDto>((page, limit) =>
        getApi()
          .request<LocationDto[]>('GET', `/locations${buildQuery({ page, limit })}`)
          .then((res) => ({ items: res.data, meta: res.meta })),
      );
      return items.map((dto, index) => mapLocation(dto, index === 0));
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, LOCATION_LOAD_FALLBACK_AR));
    }
  }

  /** Creates an owned location (real API) and returns it selectable. */
  async createLocation(input: { labelAr: string; addressAr: string }): Promise<RequestLocation> {
    const label = input.labelAr.trim();
    const address = input.addressAr.trim();
    if (label.length === 0) {
      throw new Error('أدخل اسم الموقع');
    }
    try {
      const res = await getApi().request<LocationDto>('POST', '/locations', {
        label,
        ...(address.length > 0 ? { address_text: address } : {}),
      });
      return mapLocation(res.data, false);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, LOCATION_CREATE_FALLBACK_AR));
    }
  }

  async submitRequest(draft: ServiceRequestDraft): Promise<ServiceRequestSubmission> {
    if (draft.technicianId.length === 0 || draft.appliance === null) {
      throw new ServiceRequestSubmissionError('بيانات الطلب غير مكتملة');
    }
    if (draft.locationId === null) {
      // Honest failure — the backend requires an owned location id and
      // no locations API exists to create/select one (see header).
      throw new ServiceRequestSubmissionError(LOCATION_MISSING_AR);
    }
    const applianceCategoryId = await categoryIdBySlug(draft.appliance);
    if (applianceCategoryId === null) {
      throw new ServiceRequestSubmissionError('بيانات الطلب غير مكتملة');
    }
    const resolvedTitle = await this.resolveProblemTitle(draft);
    const body = {
      technician_id: draft.technicianId,
      appliance_category_id: applianceCategoryId,
      ...(draft.symptomId !== null && draft.symptomId.length > 0
        ? { fault_id: draft.symptomId }
        : {}),
      problem_title: resolvedTitle,
      problem_description:
        draft.descriptionAr.trim().length > 0 ? draft.descriptionAr.trim() : resolvedTitle,
      location_id: draft.locationId,
    };
    try {
      const res = await getApi().request<{
        id: string;
        technicianId: string | null;
        createdAt: string;
      }>('POST', '/service-requests', body);
      return {
        requestId: res.data.id,
        technicianId: res.data.technicianId ?? draft.technicianId,
        createdAtAr: formatArDateTime(res.data.createdAt),
      };
    } catch (err: unknown) {
      throw new ServiceRequestSubmissionError(toUserMessage(err, SUBMIT_FALLBACK_AR));
    }
  }

  /** Server-safe problem title: the picked option, or the custom text. */
  private async resolveProblemTitle(draft: ServiceRequestDraft): Promise<string> {
    if (draft.problemId === 'other' || draft.problemId === null) {
      const custom = draft.customProblemAr.trim();
      if (custom.length > 0) return custom;
    } else {
      const problems = await mapProblemOptions();
      const found = problems.find((p) => p.id === draft.problemId);
      if (found !== undefined) return found.titleAr;
    }
    const fallback = draft.descriptionAr.trim();
    return fallback.length > 0 ? fallback : 'طلب صيانة';
  }
}
