/**
 * Mock `ServiceRequestDataSource` (Batch D).
 *
 * Form data (problems, saved locations, appointment slots) plus a
 * typed mock submission. Submission is an in-memory adapter: it
 * validates the draft shape, waits briefly, and returns a typed
 * result — or throws a typed error when constructed in `failing`
 * mode (used by the error-path QA/tests; the shipped screen uses
 * the default success mode). No HTTP, no persistence, no Storage.
 */

import type {
  ProblemOption,
  RequestAttachment,
  RequestLocation,
  ServiceRequestDraft,
} from './service-request-types';

export interface ServiceRequestFormData {
  readonly problems: ReadonlyArray<ProblemOption>;
  readonly locations: ReadonlyArray<RequestLocation>;
}

/** Presigned PUT grant for one request photo (Track B2). */
export interface ServiceRequestPhotoUploadGrant {
  readonly storageKey: string;
  readonly uploadUrl: string;
  readonly requiredHeaders: Record<string, string>;
  readonly mimeType: string;
  readonly maxBytes: number;
  readonly expiresInSeconds: number;
}

export interface ServiceRequestSubmission {
  readonly requestId: string;
  readonly technicianId: string;
  readonly createdAtAr: string;
}

export class ServiceRequestSubmissionError extends Error {
  constructor(message = 'فشل إرسال الطلب. تحقق من الاتصال وحاول مجددًا') {
    super(message);
    this.name = 'ServiceRequestSubmissionError';
  }
}

export interface ServiceRequestDataSource {
  getFormData(input: { role: 'customer' }): Promise<ServiceRequestFormData>;
  /** Creates an owned location (Task REM-001) and returns it selectable. */
  createLocation(input: { labelAr: string; addressAr: string }): Promise<RequestLocation>;
  submitRequest(draft: ServiceRequestDraft): Promise<ServiceRequestSubmission>;
  /**
   * Photo uploads (Track B2) — only valid AFTER the request id exists:
   * grant (server-chosen key) → raw PUT → confirm. Sequential by design.
   */
  requestPhotoUploadUrl(input: {
    requestId: string;
    mimeType: string;
  }): Promise<ServiceRequestPhotoUploadGrant>;
  putPhotoBytes(input: {
    grant: ServiceRequestPhotoUploadGrant;
    photo: RequestAttachment;
  }): Promise<void>;
  confirmPhoto(input: { requestId: string; storageKey: string }): Promise<void>;
}

const FORM_FIXTURE: ServiceRequestFormData = {
  problems: [
    { id: 'wm-no-power', applianceSlug: 'washing_machine', titleAr: 'الغسالة لا تعمل إطلاقًا' },
    { id: 'wm-vibration', applianceSlug: 'washing_machine', titleAr: 'اهتزاز قوي أثناء العصر' },
    { id: 'wm-leak', applianceSlug: 'washing_machine', titleAr: 'تسرب مياه' },
    { id: 'rf-weak-cooling', applianceSlug: 'refrigerator', titleAr: 'ضعف التبريد' },
    { id: 'rf-ice-buildup', applianceSlug: 'refrigerator', titleAr: 'تراكم الثلج في الفريزر' },
    { id: 'rf-noise', applianceSlug: 'refrigerator', titleAr: 'صوت مرتفع' },
    { id: 'ac-no-cooling', applianceSlug: 'air_conditioner', titleAr: 'المكيف لا يبرد' },
    { id: 'ac-water-drip', applianceSlug: 'air_conditioner', titleAr: 'تنقيط مياه' },
    { id: 'ac-smell', applianceSlug: 'air_conditioner', titleAr: 'رائحة غير مستحبة' },
    { id: 'general-maintenance', applianceSlug: null, titleAr: 'صيانة دورية عامة' },
    { id: 'general-installation', applianceSlug: null, titleAr: 'تركيب أو نقل الجهاز' },
  ],
  locations: [
    { id: 'home', labelAr: 'المنزل', detailAr: 'القاهرة – حي مدينة نصر، شارع عباس العقاد', isDefault: true },
    { id: 'office', labelAr: 'المكتب', detailAr: 'القاهرة – حي المعادي، شارع التحرير', isDefault: false },
  ],
};

export class MockServiceRequestDataSource implements ServiceRequestDataSource {
  private readonly createdLocations: RequestLocation[] = [];

  constructor(private readonly mode: 'success' | 'failing' = 'success') {}

  async getFormData(_input: { role: 'customer' }): Promise<ServiceRequestFormData> {
    const fixture = JSON.parse(JSON.stringify(FORM_FIXTURE)) as ServiceRequestFormData;
    return { ...fixture, locations: [...fixture.locations, ...this.createdLocations] };
  }

  async createLocation(input: { labelAr: string; addressAr: string }): Promise<RequestLocation> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (this.mode === 'failing') {
      throw new Error('فشل إضافة الموقع. حاول مجددًا');
    }
    const created: RequestLocation = {
      id: `loc-${String(this.createdLocations.length + 1)}-${String(Date.now() % 100000)}`,
      labelAr: input.labelAr.trim(),
      detailAr: input.addressAr.trim().length > 0 ? input.addressAr.trim() : '—',
      isDefault: false,
    };
    this.createdLocations.push(created);
    return created;
  }

  async submitRequest(draft: ServiceRequestDraft): Promise<ServiceRequestSubmission> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (this.mode === 'failing') {
      throw new ServiceRequestSubmissionError();
    }
    if (draft.technicianId.length === 0 || draft.appliance === null || draft.locationId === null) {
      throw new ServiceRequestSubmissionError('بيانات الطلب غير مكتملة');
    }
    return {
      requestId: 'REQ-2026-0481',
      technicianId: draft.technicianId,
      createdAtAr: 'اليوم',
    };
  }

  async requestPhotoUploadUrl(input: {
    requestId: string;
    mimeType: string;
  }): Promise<ServiceRequestPhotoUploadGrant> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (this.mode === 'failing') {
      throw new Error('تعذر تجهيز رفع الصور. حاول مجددًا');
    }
    const extension =
      input.mimeType === 'image/png' ? 'png' : input.mimeType === 'image/webp' ? 'webp' : 'jpg';
    return {
      storageKey: `mock/request-media/${input.requestId}/${String(Date.now())}.${extension}`,
      uploadUrl: `mock://upload/${input.requestId}`,
      requiredHeaders: { 'Content-Type': input.mimeType },
      mimeType: input.mimeType,
      maxBytes: 5 * 1024 * 1024,
      expiresInSeconds: 300,
    };
  }

  async putPhotoBytes(_input: {
    grant: ServiceRequestPhotoUploadGrant;
    photo: RequestAttachment;
  }): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (this.mode === 'failing') {
      throw new Error('تعذر رفع الصورة. تحقق من الاتصال وحاول مجددًا');
    }
  }

  async confirmPhoto(_input: { requestId: string; storageKey: string }): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (this.mode === 'failing') {
      throw new Error('تعذر تأكيد رفع الصورة. حاول مجددًا');
    }
  }
}
