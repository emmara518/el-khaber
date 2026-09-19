import { useCallback, useEffect, useState } from 'react';

import { ApiSubscriptionsDataSource, type SubscriptionsDataSource } from './api-subscriptions-data-source';
import { canCancelRenewal, canSelectPlan, subscribeNextAction, type CurrentSubscription, type SubscriptionPlan, type SubscriptionRole } from './subscription-types';

export type SubscriptionLoadStatus = 'loading' | 'loaded' | 'error';

export interface SubscriptionViewState {
  readonly plans: ReadonlyArray<SubscriptionPlan>;
  readonly current: CurrentSubscription | null;
  readonly status: SubscriptionLoadStatus;
  readonly error: Error | null;
  readonly cancelling: boolean;
  readonly cancelError: string | null;
  readonly reload: () => void;
  readonly cancelRenewal: () => void;
}

export function useSubscriptionViewModel(
  role: SubscriptionRole = 'customer',
  source: SubscriptionsDataSource = new ApiSubscriptionsDataSource(),
): SubscriptionViewState {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [plans, setPlans] = useState<ReadonlyArray<SubscriptionPlan>>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [status, setStatus] = useState<SubscriptionLoadStatus>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    Promise.all([stableSource.getPlans({ role }), stableSource.getCurrent({ role })])
      .then(([planRows, currentRow]) => {
        if (cancelled) return;
        setPlans(planRows);
        setCurrent(currentRow);
        setStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [stableSource, role, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const cancelRenewal = useCallback(() => {
    if (current === null || !canCancelRenewal(current)) return;
    setCancelling(true);
    setCancelError(null);
    void (async () => {
      try {
        const updated = await stableSource.cancelRenewal({ role, subscriptionId: current.id });
        setCurrent(updated ?? current);
      } catch (err) {
        setCancelError(err instanceof Error ? err.message : 'تعذر إلغاء التجديد. حاول مجددًا');
      } finally {
        setCancelling(false);
      }
    })();
  }, [stableSource, role, current]);

  return {
    plans,
    current,
    status,
    error,
    cancelling,
    cancelError,
    reload,
    cancelRenewal,
  };
}

export { canSelectPlan, subscribeNextAction };
