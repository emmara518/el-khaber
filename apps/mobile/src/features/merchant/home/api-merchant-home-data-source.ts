/**
 * Real API `MerchantHomeDataSource` (Task 10J).
 *
 * Composed from documented merchant reads (docs/07 §14/§17):
 * - GET /merchant/profile — own profile (404 until onboarding; the
 *   documented onboarding-persistence behavior),
 * - GET /merchant/products — catalog counters (server `meta.total`
 *   plus the real active/suspended split over the bounded window),
 * - GET /merchant/subscription/current — presentation-only plan
 *   context (docs/08).
 *
 * Normalization:
 * - verification: backend `verified|pending|rejected|suspended` maps
 *   onto the screen's 3-state model (`rejected`/`suspended` →
 *   `action_required` — the merchant can act on it),
 * - a missing profile (404) renders the honest incomplete state with
 *   empty fields — no fabricated store identity,
 * - city text is not part of MerchantProfileDto (locationId only, and
 *   no locations API) → empty (reported gap).
 */

import { getApi } from '../../../lib/api-client';
import { drainPages } from '../../../lib/api-query';

import type {
  MerchantHomeDataSource,
  MerchantHomeViewModel,
  MerchantVerification,
} from './merchant-home-types';
import type {
  CurrentSubscriptionDto,
  MerchantProfileDto,
  MerchantProductDto,
} from '@khabir/shared-types';

/** Backend verification → the screen's 3-state model. */
export function mapVerification(
  status: MerchantProfileDto['verificationStatus'],
): MerchantVerification {
  switch (status) {
    case 'verified':
      return 'verified';
    case 'pending':
      return 'pending';
    case 'rejected':
    case 'suspended':
      return 'action_required';
    default:
      return 'action_required';
  }
}

/** Real subscription status → Arabic display copy (docs/08 states). */
export function subscriptionStatusAr(status: CurrentSubscriptionDto['status']): string {
  switch (status) {
    case 'active':
      return 'نشطة';
    case 'pending':
      return 'بانتظار التفعيل';
    case 'trialing':
      return 'فترة تجريبية';
    case 'past_due':
      return 'متأخرة السداد';
    case 'cancelled':
      return 'ملغاة';
    case 'expired':
      return 'منتهية';
  }
}

export class ApiMerchantHomeDataSource implements MerchantHomeDataSource {
  async getHome(_input: { role: 'merchant' }): Promise<MerchantHomeViewModel> {
    const api = getApi();
    const profile = await api
      .request<MerchantProfileDto>('GET', '/merchant/profile')
      .then((res) => res.data)
      .catch((err: unknown) => {
        // Documented behavior: profile answers 404 until the merchant
        // PATCHes (onboarding not completed) → honest incomplete state.
        const status = (err as { status?: number }).status;
        if (status === 404) return null;
        throw err;
      });
    const products = await drainPages<MerchantProductDto>((page, limit) =>
      api
        .request<MerchantProductDto[]>(
          'GET',
          `/merchant/products?page=${String(page)}&limit=${String(limit)}`,
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    const subscription = await api
      .request<{ subscription: CurrentSubscriptionDto | null }>(
        'GET',
        '/merchant/subscription/current',
      )
      .then((res) => res.data.subscription)
      .catch(() => null); // entitlement read failing must not break home

    const activeProducts = products.filter((p) => p.status === 'active').length;
    const businessName = profile?.businessName ?? '';
    return {
      profile: {
        businessNameAr: businessName,
        initialsAr: businessName.trim().length > 0 ? businessName.trim().slice(0, 1) : '',
        cityAr: '', // location text not exposed by the merchant profile (gap)
        verification: profile !== null ? mapVerification(profile.verificationStatus) : 'action_required',
        verificationNoteAr:
          profile !== null
            ? mapVerification(profile.verificationStatus) === 'verified'
              ? 'تم التحقق من بيانات المتجر من قبل فريق الخبير.'
              : ''
            : 'أكمل بيانات متجرك لعرضها للعملاء.',
      },
      catalog: {
        totalProducts: products.length,
        activeProducts,
        inactiveProducts: products.length - activeProducts,
      },
      subscription:
        subscription !== null && subscription.plan !== null
          ? {
              planNameAr: subscription.plan.nameAr,
              statusAr: subscriptionStatusAr(subscription.status),
            }
          : null,
      role: 'merchant',
    };
  }
}
