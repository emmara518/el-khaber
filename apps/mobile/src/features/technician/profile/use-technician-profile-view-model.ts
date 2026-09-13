/**
 * View-model hook for the technician profile (view + edit + save).
 * Accepts a data-source override for deterministic QA of every
 * verification state.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiTechnicianProfileDataSource } from './api-technician-profile-data-source';

import type { TechnicianProfile, TechnicianProfileDataSource, TechnicianProfileDraft } from './technician-profile-types';

export type TechnicianProfileLoadStatus = 'loading' | 'loaded' | 'error';
export type TechnicianProfileSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface TechnicianProfileViewModel {
  loadStatus: TechnicianProfileLoadStatus;
  loadError: Error | null;
  reload: () => void;
  profile: TechnicianProfile | null;
  editing: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  saveStatus: TechnicianProfileSaveStatus;
  saveError: string | null;
  save: (draft: TechnicianProfileDraft) => void;
  retrySave: (draft: TechnicianProfileDraft) => void;
}

export function useTechnicianProfileViewModel(
  source: TechnicianProfileDataSource = new ApiTechnicianProfileDataSource(),
): TechnicianProfileViewModel {
  const [attempt, setAttempt] = useState(0);
  const [loadStatus, setLoadStatus] = useState<TechnicianProfileLoadStatus>('loading');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<TechnicianProfileSaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadStatus('loading');
    setLoadError(null);
    source
      .getProfile({ role: 'technician' })
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
  }, [attempt, source]);

  const persist = useCallback(
    (draft: TechnicianProfileDraft) => {
      if (saveStatus === 'saving' || saveStatus === 'saved') return;
      setSaveStatus('saving');
      setSaveError(null);
      void (async () => {
        try {
          const updated = await source.saveProfile({ role: 'technician', profile: draft });
          setProfile(updated);
          setSaveStatus('saved');
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : 'فشل حفظ الملف');
          setSaveStatus('error');
        }
      })();
    },
    [source, saveStatus],
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
    (draft: TechnicianProfileDraft) => {
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
