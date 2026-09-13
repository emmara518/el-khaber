/**
 * View-model hook for the merchant profile (view + edit + save).
 * Accepts a data-source override for deterministic QA of every
 * verification state.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiMerchantProfileDataSource } from './api-merchant-profile-data-source';

import type { MerchantProfile, MerchantProfileDataSource, MerchantProfileDraft } from './merchant-profile-types';

export type MerchantProfileLoadStatus = 'loading' | 'loaded' | 'error';
export type MerchantProfileSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface MerchantProfileViewModel {
  loadStatus: MerchantProfileLoadStatus;
  loadError: Error | null;
  reload: () => void;
  profile: MerchantProfile | null;
  editing: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  saveStatus: MerchantProfileSaveStatus;
  saveError: string | null;
  save: (draft: MerchantProfileDraft) => void;
  retrySave: (draft: MerchantProfileDraft) => void;
}

export function useMerchantProfileViewModel(
  source: MerchantProfileDataSource = new ApiMerchantProfileDataSource(),
): MerchantProfileViewModel {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [loadStatus, setLoadStatus] = useState<MerchantProfileLoadStatus>('loading');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<MerchantProfileSaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadStatus('loading');
    setLoadError(null);
    stableSource
      .getProfile({ role: 'merchant' })
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setLoadStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err : new Error(String(err)));
        setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [stableSource, attempt]);

  const persist = useCallback(
    (draft: MerchantProfileDraft) => {
      if (saveStatus === 'saving' || saveStatus === 'saved') return;
      setSaveStatus('saving');
      setSaveError(null);
      void (async () => {
        try {
          const updated = await stableSource.saveProfile({ role: 'merchant', profile: draft });
          setProfile(updated);
          setSaveStatus('saved');
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : 'فشل حفظ بيانات المتجر');
          setSaveStatus('error');
        }
      })();
    },
    [stableSource, saveStatus],
  );

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const startEdit = useCallback(() => {
    setSaveStatus('idle');
    setSaveError(null);
    setEditing(true);
  }, []);
  const cancelEdit = useCallback(() => {
    setSaveStatus('idle');
    setSaveError(null);
    setEditing(false);
  }, []);
  const retrySave = useCallback(
    (draft: MerchantProfileDraft) => {
      setSaveStatus('idle');
      setSaveError(null);
      persist(draft);
    },
    [persist],
  );

  return {
    loadStatus,
    loadError,
    reload,
    profile,
    editing,
    startEdit,
    cancelEdit,
    saveStatus,
    saveError,
    save: persist,
    retrySave,
  };
}
