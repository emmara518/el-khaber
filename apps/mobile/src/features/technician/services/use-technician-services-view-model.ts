/**
 * View-model hook for the Technician Services screen (T-F).
 *
 * Owns attached + catalog loading and the add/remove lifecycle
 * (idle → submitting → success | error). Mutations refresh the attached
 * list from the server — the UI never mutates rendered rows directly.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  ApiTechnicianServicesDataSource,
  TechnicianServiceError,
} from './api-technician-services-data-source';

import type {
  TechnicianAttachedService,
  TechnicianServiceCatalogItem,
  TechnicianServicesDataSource,
} from './technician-services-types';

export type TechnicianServicesLoadStatus = 'loading' | 'loaded' | 'error';
export type TechnicianServiceActionStatus = 'idle' | 'submitting' | 'removing' | 'success' | 'error';

export interface TechnicianServicesViewModel {
  loadStatus: TechnicianServicesLoadStatus;
  loadError: Error | null;
  attached: ReadonlyArray<TechnicianAttachedService>;
  catalog: ReadonlyArray<TechnicianServiceCatalogItem>;
  actionStatus: TechnicianServiceActionStatus;
  actionError: string | null;
  /** Service id currently being added/removed (for per-row spinners). */
  pendingServiceId: string | null;
  add: (serviceId: string) => void;
  remove: (serviceId: string) => void;
  resetAction: () => void;
  reload: () => void;
}

export function useTechnicianServicesViewModel(
  provided?: TechnicianServicesDataSource,
): TechnicianServicesViewModel {
  const [source] = useState(() => provided ?? new ApiTechnicianServicesDataSource());
  const [attempt, setAttempt] = useState(0);
  const [loadStatus, setLoadStatus] = useState<TechnicianServicesLoadStatus>('loading');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [attached, setAttached] = useState<ReadonlyArray<TechnicianAttachedService>>([]);
  const [catalog, setCatalog] = useState<ReadonlyArray<TechnicianServiceCatalogItem>>([]);
  const [actionStatus, setActionStatus] = useState<TechnicianServiceActionStatus>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadStatus('loading');
    setLoadError(null);
    try {
      const [nextAttached, nextCatalog] = await Promise.all([
        source.getAttached({ role: 'technician' }),
        source.getCatalog({ role: 'technician' }),
      ]);
      setAttached(nextAttached);
      setCatalog(nextCatalog);
      setLoadStatus('loaded');
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)));
      setLoadStatus('error');
    }
  }, [source]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  const runAction = useCallback(
    (serviceId: string, kind: 'add' | 'remove') => {
      if (actionStatus === 'submitting' || actionStatus === 'removing') return;
      setActionStatus(kind === 'remove' ? 'removing' : 'submitting');
      setActionError(null);
      setPendingServiceId(serviceId);
      void (async () => {
        try {
          if (kind === 'add') await source.addService({ role: 'technician', serviceId });
          else await source.removeService({ role: 'technician', serviceId });
          const next = await source.getAttached({ role: 'technician' });
          setAttached(next);
          setActionStatus('success');
        } catch (err) {
          setActionError(
            err instanceof TechnicianServiceError ? err.message : 'تعذر تحديث خدماتك. حاول مرة أخرى.',
          );
          setActionStatus('error');
        } finally {
          setPendingServiceId(null);
        }
      })();
    },
    [source, actionStatus],
  );

  const add = useCallback((serviceId: string) => runAction(serviceId, 'add'), [runAction]);
  const remove = useCallback((serviceId: string) => runAction(serviceId, 'remove'), [runAction]);
  const resetAction = useCallback(() => {
    setActionStatus('idle');
    setActionError(null);
  }, []);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    loadStatus,
    loadError,
    attached,
    catalog,
    actionStatus,
    actionError,
    pendingServiceId,
    add,
    remove,
    resetAction,
    reload,
  };
}
