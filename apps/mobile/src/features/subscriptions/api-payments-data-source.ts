/**
 * Real API manual-payment adapter (Task 10J).
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
 * PAYMENT PROOF: `proof_storage_key` is sent ONLY when the UI supplies
 * one; the backend has NO approved proof-storage infrastructure in 10J,
 * so the app MUST NOT fabricate base64/file-path/URL proof values here.
 * Proof image upload remains BLOCKED (reported).
 */

import { getApi } from '../../lib/api-client';
import { toUserMessage } from '../../lib/api-error';
import { buildQuery, drainPages } from '../../lib/api-query';

import { paymentStatusAr } from './subscription-types';

import type { PaymentMethod, SubscriptionRole } from './subscription-types';
import type { PaymentMethodConfigDto, PaymentSubmissionDto } from '@khabir/shared-types';

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
}

export interface PaymentsDataSource {
  getConfig(input: { role: SubscriptionRole }): Promise<ReadonlyArray<PaymentMethodConfig>>;
  submitPayment(input: {
    role: SubscriptionRole;
    planId: string;
    method: PaymentMethod;
    transferReference: string;
    proofStorageKey?: string;
  }): Promise<PaymentSubmission>;
  getSubmissions(input: { role: SubscriptionRole }): Promise<ReadonlyArray<PaymentSubmission>>;
}

function mapSubmission(dto: PaymentSubmissionDto): PaymentSubmission {
  return {
    id: dto.id,
    planId: dto.planId,
    method: dto.method,
    transferReference: dto.transferReference,
    status: dto.status,
    statusAr: paymentStatusAr(dto.status),
  };
}

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
      throw new Error(toUserMessage(err, 'تعذر تحميل وسائل الدفع المتاحة. تحقق من الاتصال وحاول مجددًا'));
    }
  }

  async submitPayment(input: {
    role: SubscriptionRole;
    planId: string;
    method: PaymentMethod;
    transferReference: string;
    proofStorageKey?: string;
  }): Promise<PaymentSubmission> {
    try {
      const path = input.role === 'merchant' ? '/merchant/subscription/payment' : '/subscriptions';
      const body: Record<string, string> = {
        plan_id: input.planId,
        method: input.method,
        transfer_reference: input.transferReference,
      };
      if (input.proofStorageKey !== undefined && input.proofStorageKey.trim().length > 0) {
        body['proof_storage_key'] = input.proofStorageKey;
      }
      const res = await getApi().request<PaymentSubmissionDto>('POST', path, body);
      return mapSubmission(res.data);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر إرسال طلب الدفع. تحقق من البيانات وحاول مجددًا'));
    }
  }

  async getSubmissions(input: { role: SubscriptionRole }): Promise<ReadonlyArray<PaymentSubmission>> {
    void input.role; // history is scoped server-side to the JWT subject
    try {
      const items = await drainPages<PaymentSubmissionDto>((page, limit) =>
        getApi()
          .request<PaymentSubmissionDto[]>('GET', `/payments/submissions${buildQuery({ page, limit })}`)
          .then((res) => ({ items: res.data, meta: res.meta })),
      );
      return items.map(mapSubmission);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر تحميل سجل المدفوعات. تحقق من الاتصال وحاول مجددًا'));
    }
  }
}
