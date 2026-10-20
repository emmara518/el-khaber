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
 * Preferred appointment (Track B1): there is no availability engine or
 * slot inventory. The optional `scheduled_at` is the customer's PREFERRED
 * visit time (future, within 14 days) that the technician confirms by
 * phone. The API re-validates the window authoritatively.
 *
 * REMAINING CONTRACT GAPS (reported — NOT invented around):
 * - `service_id`: the request form does not select a service entry
 *   (the fault already links services server-side), so it is omitted.
 */

import * as FileSystem from 'expo-file-system';

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
  type ServiceRequestPhotoUploadGrant,
  type ServiceRequestSubmission,
} from './mock-service-request-data-source';
import { preferredAppointmentError } from './preferred-appointment';


import type {
  ProblemOption,
  RequestAttachment,
  RequestLocation,
  ServiceRequestDraft,
} from './service-request-types';
import type {
  FaultSummaryDto,
  LocationDto,
  ServiceRequestMediaUploadUrlDto,
} from '@khabir/shared-types';

export { ServiceRequestSubmissionError };
export type {
  ServiceRequestDataSource,
  ServiceRequestFormData,
  ServiceRequestPhotoUploadGrant,
  ServiceRequestSubmission,
} from './mock-service-request-data-source';

const SUBMIT_FALLBACK_AR = 'فشل إرسال الطلب. تحقق من الاتصال وحاول مجددًا';
const LOCATION_MISSING_AR = 'اختر موقع تقديم الخدمة أو أضف موقعًا جديدًا';
const LOCATION_LOAD_FALLBACK_AR = 'تعذر تحميل المواقع. تحقق من الاتصال وحاول مجددًا';
const LOCATION_CREATE_FALLBACK_AR = 'تعذر حفظ الموقع. تحقق من الاتصال وحاول مجددًا';

const LOCAL_UPLOAD_SCHEME = 'local://';
const LOCAL_UPLOAD_BLOCKED_AR =
  'الرفع المحلي غير مدعوم في هذه البيئة. شغّل الخادم مع تخزين S3 للحصول على روابط رفع حقيقية.';
const PHOTO_GRANT_FALLBACK_AR = 'تعذر تجهيز رفع الصور. تحقق من الاتصال وحاول مجددًا';
const PHOTO_PUT_FALLBACK_AR = 'تعذر رفع الصورة. تحقق من الاتصال وحاول مجددًا';
const PHOTO_CONFIRM_FALLBACK_AR = 'تعذر تأكيد رفع الصورة. حاول مجددًا';

/** Maps a backend LocationDto → the form's RequestLocation shape. */
export function mapLocation(dto: LocationDto, isDefault: boolean): RequestLocation {
  const detailParts = [dto.addressText, dto.city, dto.region].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  return {
    id: dto.id,
    labelAr: dto.label ?? 'موقع',
    // Empty when no address parts exist — the UI omits the detail line
    // rather than showing a dangling separator / raw dash.
    detailAr: detailParts.join('، '),
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
    return { problems, locations };
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
      // Honest failure — submission requires a location selected in the
      // location step (owned locations via GET /locations, created inline
      // via POST /locations). Nothing is fabricated or defaulted here.
      throw new ServiceRequestSubmissionError(LOCATION_MISSING_AR);
    }
    const applianceCategoryId = await categoryIdBySlug(draft.appliance);
    if (applianceCategoryId === null) {
      throw new ServiceRequestSubmissionError('بيانات الطلب غير مكتملة');
    }
    const appointmentError = preferredAppointmentError(draft.preferredAtISO);
    if (appointmentError !== null) {
      throw new ServiceRequestSubmissionError(appointmentError);
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
      ...(draft.preferredAtISO !== null ? { scheduled_at: draft.preferredAtISO } : {}),
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

  /**
   * Grants a presigned PUT for one photo of an EXISTING request (Track B2).
   * The storage key is server-generated; the client never picks it.
   */
  async requestPhotoUploadUrl(input: {
    requestId: string;
    mimeType: string;
  }): Promise<ServiceRequestPhotoUploadGrant> {
    try {
      const res = await getApi().request<ServiceRequestMediaUploadUrlDto>(
        'POST',
        `/service-requests/${encodeURIComponent(input.requestId)}/media/upload-url`,
        { mime_type: input.mimeType },
      );
      return {
        uploadUrl: res.data.uploadUrl,
        storageKey: res.data.storageKey,
        requiredHeaders: res.data.requiredHeaders ?? {},
        maxBytes: res.data.maxBytes,
        expiresInSeconds: res.data.expiresInSeconds,
        mimeType: res.data.mimeType,
      };
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, PHOTO_GRANT_FALLBACK_AR));
    }
  }

  /**
   * Raw binary PUT to the presigned URL (expo-file-system — FormData would
   * break the signed Content-Type). The `local://` adapter can never receive
   * bytes, so it is refused explicitly instead of failing silently.
   */
  async putPhotoBytes(input: {
    grant: ServiceRequestPhotoUploadGrant;
    photo: RequestAttachment;
  }): Promise<void> {
    if (input.grant.uploadUrl.startsWith(LOCAL_UPLOAD_SCHEME)) {
      throw new Error(LOCAL_UPLOAD_BLOCKED_AR);
    }
    try {
      const result = await FileSystem.uploadAsync(input.grant.uploadUrl, input.photo.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          ...input.grant.requiredHeaders,
          'Content-Type': input.photo.mimeType,
        },
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`PUT failed with status ${String(result.status)}`);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === LOCAL_UPLOAD_BLOCKED_AR) {
        throw err;
      }
      throw new Error(toUserMessage(err, PHOTO_PUT_FALLBACK_AR));
    }
  }

  /** Confirms the uploaded object; the server HEAD-verifies before persisting. */
  async confirmPhoto(input: { requestId: string; storageKey: string }): Promise<void> {
    try {
      await getApi().request<ServiceRequestMediaUploadUrlDto>(
        'POST',
        `/service-requests/${encodeURIComponent(input.requestId)}/media/confirm`,
        { storage_key: input.storageKey },
      );
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, PHOTO_CONFIRM_FALLBACK_AR));
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
