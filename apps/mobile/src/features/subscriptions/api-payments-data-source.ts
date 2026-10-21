/**
 * Real API manual-payment adapter (Task 10J, WP-Proof).
 *
 * Backbone for the subscription/payment integration surface — same
 * layering as subscriptions (ViewModel → PaymentsDataSource →
 * ApiPaymentsDataSource → existing client → NestJS → PostgreSQL):
 *
 * - GET /payments/config — ENABLED manual destinations only
 *   (approved methods: instapay | vodafone_cash — never Visa/Fawry),
 * - POST /subscriptions (merchant: POST /merchant/subscription/payment)
 *   — creates a PENDING submission; admin approval is server-side,
 * - GET /payments/submissions — own resubmission history (paginated).
 *
 * PAYMENT PROOF (WP-Proof): the proof attaches POST-creation through
 * the dedicated endpoints — `requestProofUploadUrl` (server-generated
 * key + presigned PUT) → raw `PUT` of the bytes → `confirmProof`
 * (server validates MIME/size/magic + binds). `proof_storage_key` is
 * NEVER sent on creation (the backend rejects it with 400); the stale
 * passthrough was removed.
 *
 * Local-dev honesty: the local storage adapter issues non-routable
 * `local://` upload URLs (no HTTP receiver). `putProofBytes` refuses
 * them with an explicit Arabic error instead of failing silently —
 * proof upload works against an S3-configured API.
 */

import * as FileSystem from 'expo-file-system';

import { getApi } from '../../lib/api-client';
import { toUserMessage } from '../../lib/api-error';
import { buildQuery, drainPages } from '../../lib/api-query';

import { paymentStatusAr } from './subscription-types';

import type { PaymentMethod, SubscriptionRole } from './subscription-types';
import type { PickedPhoto } from '../../lib/profile-photo';
import type {
  PaymentMethodConfigDto,
  PaymentSubmissionDto,
  ProofUploadUrlDto,
} from '@khabir/shared-types';

export interface PaymentMethodConfig {
  readonly method: PaymentMethod;
  readonly displayName: string;
  readonly accountIdentifier: string;
}

export interface PaymentSubmission {
  readonly id: string;
  readonly planId: string;
  readonly method: PaymentMethod;
  readonly transferReference: string;
  readonly status: PaymentSubmissionDto['status'];
  readonly statusAr: string;
  /** True when a proof image is already bound (server truth). */
  readonly hasProof: boolean;
}

export interface ProofUploadGrant {
  readonly uploadUrl: string;
  readonly storageKey: string;
  readonly requiredHeaders: Record<string, string>;
  readonly maxBytes: number;
  readonly expiresInSeconds: number;
  readonly mimeType: string;
}

export interface PaymentsDataSource {
  getConfig(input: { role: SubscriptionRole }): Promise<ReadonlyArray<PaymentMethodConfig>>;
  submitPayment(input: {
    role: SubscriptionRole;
    planId: string;
    method: PaymentMethod;
    transferReference: string;
  }): Promise<PaymentSubmission>;
  getSubmissions(input: { role: SubscriptionRole }): Promise<ReadonlyArray<PaymentSubmission>>;
  requestProofUploadUrl(input: {
    submissionId: string;
    mimeType: string;
  }): Promise<ProofUploadGrant>;
  putProofBytes(input: { grant: ProofUploadGrant; photo: PickedPhoto }): Promise<void>;
  confirmProof(input: { submissionId: string; storageKey: string }): Promise<PaymentSubmission>;
}

function mapSubmission(dto: PaymentSubmissionDto): PaymentSubmission {
  return {
    id: dto.id,
    planId: dto.planId,
    method: dto.method,
    transferReference: dto.transferReference,
    status: dto.status,
    statusAr: paymentStatusAr(dto.status),
    hasProof: dto.proofStorageKey !== null,
  };
}

const LOCAL_UPLOAD_SCHEME = 'local://';
const LOCAL_UPLOAD_BLOCKED_AR =
  'الرفع المباح غير متاح في بيئة التطوير المحلية. يعمل إرفاق الإثبات مع خادم مهيأ للتخزين السحابي.';

export class ApiPaymentsDataSource implements PaymentsDataSource {
  async getConfig(input: { role: SubscriptionRole }): Promise<ReadonlyArray<PaymentMethodConfig>> {
    void input.role; // enabled methods are product-level, not per-role
    try {
      const res = await getApi().request<PaymentMethodConfigDto[]>('GET', '/payments/config');
      return res.data.map((dto) => ({
        method: dto.method,
        displayName: dto.displayName,
        accountIdentifier: dto.accountIdentifier,
      }));
    } catch (err: unknown) {
      throw new Error(
        toUserMessage(err, 'تعذر تحميل وسائل الدفع المتاحة. تحقق من الاتصال وحاول مجددًا'),
      );
    }
  }

  async submitPayment(input: {
    role: SubscriptionRole;
    planId: string;
    method: PaymentMethod;
    transferReference: string;
  }): Promise<PaymentSubmission> {
    try {
      const path = input.role === 'merchant' ? '/merchant/subscription/payment' : '/subscriptions';
      // NOTE: no proof_storage_key — the backend rejects it on creation
      // (400). Proof attaches post-creation via the grant/PUT/confirm
      // flow below.
      const body: Record<string, string> = {
        plan_id: input.planId,
        method: input.method,
        transfer_reference: input.transferReference,
      };
      const res = await getApi().request<PaymentSubmissionDto>('POST', path, body);
      return mapSubmission(res.data);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر إرسال طلب الدفع. تحقق من البيانات وحاول مجددًا'));
    }
  }

  async getSubmissions(input: {
    role: SubscriptionRole;
  }): Promise<ReadonlyArray<PaymentSubmission>> {
    void input.role; // history is scoped server-side to the JWT subject
    try {
      const items = await drainPages<PaymentSubmissionDto>((page, limit) =>
        getApi()
          .request<PaymentSubmissionDto[]>(
            'GET',
            `/payments/submissions${buildQuery({ page, limit })}`,
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      );
      return items.map(mapSubmission);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر تحميل سجل المدفوعات. تحقق من الاتصال وحاول مجددًا'));
    }
  }

  async requestProofUploadUrl(input: {
    submissionId: string;
    mimeType: string;
  }): Promise<ProofUploadGrant> {
    try {
      const res = await getApi().request<ProofUploadUrlDto>(
        'POST',
        `/subscriptions/${encodeURIComponent(input.submissionId)}/proof-upload-url`,
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
      throw new Error(toUserMessage(err, 'تعذر تجهيز رفع الإثبات. تحقق من الاتصال وحاول مجددًا'));
    }
  }

  /**
   * Raw binary PUT to the presigned URL (expo-file-system — FormData
   * would break the signed Content-Type). Callers pass the server
   * grant; the file bytes always come from the picked photo.
   */
  async putProofBytes(input: { grant: ProofUploadGrant; photo: PickedPhoto }): Promise<void> {
    if (input.grant.uploadUrl.startsWith(LOCAL_UPLOAD_SCHEME)) {
      throw new Error(LOCAL_UPLOAD_BLOCKED_AR);
    }
    try {
      const result = await FileSystem.uploadAsync(input.grant.uploadUrl, input.photo.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          ...input.grant.requiredHeaders,
          'Content-Type': input.grant.mimeType,
        },
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`PUT failed with status ${String(result.status)}`);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === LOCAL_UPLOAD_BLOCKED_AR) {
        throw err;
      }
      throw new Error(toUserMessage(err, 'تعذر رفع صورة الإثبات. تحقق من الاتصال وحاول مجددًا'));
    }
  }

  async confirmProof(input: {
    submissionId: string;
    storageKey: string;
  }): Promise<PaymentSubmission> {
    try {
      const res = await getApi().request<PaymentSubmissionDto>(
        'POST',
        `/subscriptions/${encodeURIComponent(input.submissionId)}/proof-confirm`,
        { storage_key: input.storageKey },
      );
      return mapSubmission(res.data);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر تأكيد الإثبات. تحقق من الصورة وحاول مجددًا'));
    }
  }
}
