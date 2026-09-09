/**
 * View-model hook for the Technician Active Service screen (T-D).
 *
 * A thin composition over `useTechnicianRequestsViewModel` + the
 * SAME shared TechnicianRequestsDataSource — one request domain,
 * one session state; list/detail/active stay consistent. Owns the
 * advance lifecycle (idle → submitting → success | stale | error)
 * and derives the current request + next documented action.
 */

import { useCallback, useState } from 'react';

import {
  advanceActionLabelAr,
} from './request-policy';
import { findTechnicianRequest } from './technician-request-types';
import { useTechnicianRequestsViewModel } from './use-technician-requests-view-model';

import type {
  MockTechnicianRequestsDataSource,
  TechnicianRequestsDataSource,
} from './mock-technician-requests-data-source';
import type { TechnicianRequest } from './technician-request-types';

export type ActiveServiceActionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface TechnicianActiveServiceViewModel {
  loadStatus: 'loading' | 'loaded' | 'error';
  loadError: Error | null;
  reload: () => void;
  /** Null → safe missing state (unknown/deleted id). */
  request: TechnicianRequest | null;
  actionStatus: ActiveServiceActionStatus;
  actionError: string | null;
  actionResult: TechnicianRequest | null;
  /** Documented next-state action label (null when none allowed). */
  nextActionAr: string | null;
  advance: () => void;
  resetAction: () => void;
}

export function useTechnicianActiveServiceViewModel(
  requestId: string,
  source?: TechnicianRequestsDataSource,
): TechnicianActiveServiceViewModel {
  const vm = useTechnicianRequestsViewModel(source);
  const [stableId] = useState(() => requestId);

  const request = findTechnicianRequest(vm.requests, stableId);
  const advanceForRequest = useCallback(() => vm.advance(stableId), [vm, stableId]);

  return {
    loadStatus: vm.listStatus,
    loadError: vm.listError,
    reload: vm.reload,
    request,
    actionStatus: vm.actionStatus,
    actionError: vm.actionError,
    actionResult: vm.actionResult,
    nextActionAr: request !== null ? advanceActionLabelAr(request.status) : null,
    advance: advanceForRequest,
    resetAction: vm.resetAction,
  };
}

export type { MockTechnicianRequestsDataSource };
