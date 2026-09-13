/**
 * Real API subscriptions adapter (Task 10J).
 *
 * UI → ViewModel (use-… hooks pending a subscription UI surface)
 * → SubscriptionsDataSource → ApiSubscriptionsDataSource
 * → existing API client (`getApi`, one-shot 401 refresh preserved)
 * → NestJS (SubscriptionsController + MerchantSubscriptionController)
 * → PostgreSQL.
 *
 * Contract (docs/07 §14, docs/08):
 * - GET /subscription-plans — active plans, role-scoped server-side
 *   (paginated, server meta per §19),
 * - GET /subscriptions/current (merchant: /merchant/subscription/current)
 *   — current subscription or null,
 * - GET /me/entitlements — effective codes (plan ∪ manual grants),
 * - POST /subscriptions/:id/cancel — cancels RENEWAL only (docs/08 §10);
 *   entitlement values are NEVER trusted from the client.
 */

import { getApi } from '../../lib/api-client';
import { toUserMessage } from '../../lib/api-error';
import { buildQuery, drainPages } from '../../lib/api-query';

import { mapCurrent, mapPlan } from './subscription-types';

import type { CurrentSubscription, SubscriptionPlan, SubscriptionRole } from './subscription-types';
import type { CurrentSubscriptionDto, MeEntitlementsDto, SubscriptionPlanDto } from '@khabir/shared-types';

export interface SubscriptionsDataSource {
  getPlans(input: { role: SubscriptionRole }): Promise<ReadonlyArray<SubscriptionPlan>>;
  getCurrent(input: { role: SubscriptionRole }): Promise<CurrentSubscription | null>;
  getEntitlements(input: { role: SubscriptionRole }): Promise<ReadonlyArray<string>>;
  cancelRenewal(input: { role: SubscriptionRole; subscriptionId: string }): Promise<CurrentSubscription | null>;
}

function currentPath(role: SubscriptionRole): string {
  return role === 'merchant' ? '/merchant/subscription/current' : '/subscriptions/current';
}

export class ApiSubscriptionsDataSource implements SubscriptionsDataSource {
  async getPlans(input: { role: SubscriptionRole }): Promise<ReadonlyArray<SubscriptionPlan>> {
    void input.role; // plan scoping is server-derived from the JWT role
    try {
      const items = await drainPages<SubscriptionPlanDto>((page, limit) =>
        getApi()
          .request<SubscriptionPlanDto[]>('GET', `/subscription-plans${buildQuery({ page, limit })}`)
          .then((res) => ({ items: res.data, meta: res.meta })),
      );
      return items.map(mapPlan);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر تحميل الباقات. تحقق من الاتصال وحاول مجددًا'));
    }
  }

  async getCurrent(input: { role: SubscriptionRole }): Promise<CurrentSubscription | null> {
    try {
      const [current, entitlements] = await Promise.all([
        input.role === 'merchant'
          ? getApi()
              .request<{ subscription: CurrentSubscriptionDto | null }>('GET', currentPath(input.role))
              .then((res) => res.data.subscription)
          : getApi()
              .request<CurrentSubscriptionDto | null>('GET', currentPath(input.role))
              .then((res) => res.data),
        this.getEntitlements(input),
      ]);
      return mapCurrent(current, entitlements);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر تحميل الاشتراك الحالي. تحقق من الاتصال وحاول مجددًا'));
    }
  }

  async getEntitlements(input: { role: SubscriptionRole }): Promise<ReadonlyArray<string>> {
    void input.role; // entitlement scoping is server-derived from the JWT
    const res = await getApi().request<MeEntitlementsDto>('GET', '/me/entitlements');
    return [...res.data.entitlements];
  }

  async cancelRenewal(input: {
    role: SubscriptionRole;
    subscriptionId: string;
  }): Promise<CurrentSubscription | null> {
    void input.role;
    try {
      const res = await getApi().request<CurrentSubscriptionDto | null>(
        'POST',
        `/subscriptions/${input.subscriptionId}/cancel`,
        {},
      );
      const entitlements = await this.getEntitlements(input).catch(() => [] as ReadonlyArray<string>);
      return mapCurrent(res.data, entitlements);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, 'تعذر إلغاء التجديد. حاول مجددًا'));
    }
  }
}
