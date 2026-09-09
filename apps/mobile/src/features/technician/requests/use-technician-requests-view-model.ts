/**
 * View-model hook for technician requests (list + detail + actions).
 *
 * Owns list loading, detail lookup, and the accept/reject lifecycle
 * (idle → submitting → success | stale | error). Accepts a
 * data-source override for deterministic QA of every path.
 * Mutations refresh the list through this boundary — screens never
 * mutate rendered cards directly.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  MockTechnicianRequestsDataSource,
  RequestActionError,
  type TechnicianRequestsDataSource,
} from './mock-technician-requests-data-source';
import { requestActionErrorAr } from './request-policy';

import type { TechnicianRequest } from './technician-request-types';

export type TechnicianRequestsStatus = 'loading' | 'loaded' | 'error';
export type RequestActionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface TechnicianRequestsViewModel {
  listStatus: TechnicianRequestsStatus;
  listError: Error | null;
  requests: ReadonlyArray<TechnicianRequest>;
  reload: () => void;
  actionStatus: RequestActionStatus;
  actionError: string | null;
  actionResult: TechnicianRequest | null;
  accept: (requestId: string) => void;
  reject: (requestId: string) => void;
  resetAction: () => void;
}

export function useTechnicianRequestsViewModel(
  source?: TechnicianRequestsDataSource,
): TechnicianRequestsViewModel {
  // Stabilize the default source: a fresh `new Mock…()` per render
  // would retrigger the loader endlessly.
  const [stableSource] = useState(
    () => source ?? new MockTechnicianRequestsDataSource(),
  );
  const [attempt, setAttempt] = useState(0);
  const [listStatus, setListStatus] = useState<TechnicianRequestsStatus>('loading');
  const [listError, setListError] = useState<Error | null>(null);
  const [requests, setRequests] = useState<ReadonlyArray<TechnicianRequest>>([]);
  const [actionStatus, setActionStatus] = useState<RequestActionStatus>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<TechnicianRequest | null>(null);

  const load = useCallback(async () => {
    setListStatus('loading');
    setListError(null);
    try {
      const data = await stableSource.getRequests({ role: 'technician' });
      setRequests(data);
      setListStatus('loaded');
    } catch (err) {
      setListError(err instanceof Error ? err : new Error(String(err)));
      setListStatus('error');
    }
  }, [stableSource]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  const runAction = useCallback(
    (requestId: string, kind: 'accept' | 'reject') => {
      if (actionStatus === 'submitting') return;
      setActionStatus('submitting');
      setActionError(null);
      setActionResult(null);
      void (async () => {
        try {
          const updated =
            kind === 'accept'
              ? await stableSource.acceptRequest({ role: 'technician', requestId })
              : await stableSource.rejectRequest({ role: 'technician', requestId });
          setRequests((current) => current.map((r) => (r.id === updated.id ? updated : r)));
          setActionResult(updated);
          setActionStatus('success');
        } catch (err) {
          if (err instanceof RequestActionError) {
            setActionError(requestActionErrorAr(actionErrorCode(err)));
          } else {
            setActionError(requestActionErrorAr('unknown'));
          }
          setActionStatus('error');
        }
      })();
    },
    [stableSource, actionStatus],
  );

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const accept = useCallback((requestId: string) => runAction(requestId, 'accept'), [runAction]);
  const reject = useCallback((requestId: string) => runAction(requestId, 'reject'), [runAction]);
  const resetAction = useCallback(() => {
    setActionStatus('idle');
    setActionError(null);
    setActionResult(null);
  }, []);

  return {
    listStatus,
    listError,
    requests,
    reload,
    actionStatus,
    actionError,
    actionResult,
    accept,
    reject,
    resetAction,
  };
}

function actionErrorCode(err: RequestActionError): 'stale' | 'invalid_transition' | 'terminal' | 'unknown' {
  switch (err.code) {
    case 'STALE':
      return 'stale';
    case 'INVALID':
      return err.reason ?? 'invalid_transition';
    case 'NOT_FOUND':
    case 'FAILED':
      return 'unknown';
  }
}
