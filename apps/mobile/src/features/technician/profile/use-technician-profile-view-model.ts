/**
 * View-model hook for the technician profile (view + edit + save)
 * plus the WP-01 profile-photo flow (pick → preview → upload, delete
 * with confirm, retry on failure). Accepts a data-source override for
 * deterministic QA of every verification state.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  pickProfilePhotoFromLibrary,
  profilePhotoSizeErrorAr,
  takeProfilePhotoWithCamera,
  type PickedPhoto,
} from '../../../lib/profile-photo';

import { ApiTechnicianProfileDataSource } from './api-technician-profile-data-source';

import type {
  TechnicianProfile,
  TechnicianProfileDataSource,
  TechnicianProfileDraft,
} from './technician-profile-types';
import type { ProfilePhotoStatus } from '../../../ui/profile-photo-section';

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
  pendingPhoto: PickedPhoto | null;
  photoStatus: ProfilePhotoStatus;
  photoError: string | null;
  pickFromLibrary: () => void;
  takeWithCamera: () => void;
  confirmPhotoUpload: () => void;
  cancelPendingPhoto: () => void;
  deletePhoto: () => void;
  retryPhoto: () => void;
  dismissPhotoStatus: () => void;
}

export function useTechnicianProfileViewModel(
  sourceOverride?: TechnicianProfileDataSource,
): TechnicianProfileViewModel {
  const [defaultSource] = useState(() => new ApiTechnicianProfileDataSource());
  const source = sourceOverride ?? defaultSource;
  const [attempt, setAttempt] = useState(0);
  const [loadStatus, setLoadStatus] = useState<TechnicianProfileLoadStatus>('loading');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<TechnicianProfileSaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PickedPhoto | null>(null);
  const [photoStatus, setPhotoStatus] = useState<ProfilePhotoStatus>('idle');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'upload' | 'delete' | null>(null);

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

  const busyPhoto =
    photoStatus === 'picking' || photoStatus === 'uploading' || photoStatus === 'deleting';

  const settlePicked = useCallback((photo: PickedPhoto | null, deniedMessage: string | null) => {
    if (photo === null && deniedMessage === null) {
      setPhotoStatus('idle');
      return;
    }
    if (deniedMessage !== null) {
      setPhotoError(deniedMessage);
      setPhotoStatus('error');
      return;
    }
    const sizeError = profilePhotoSizeErrorAr(photo?.sizeBytes ?? null);
    if (sizeError !== null) {
      setPhotoError(sizeError);
      setPhotoStatus('error');
      return;
    }
    setPendingPhoto(photo);
    setPhotoStatus('idle');
  }, []);

  const pickFromLibrary = useCallback(() => {
    if (busyPhoto) return;
    setPhotoStatus('picking');
    setPhotoError(null);
    void (async () => {
      const result = await pickProfilePhotoFromLibrary();
      if (result.outcome === 'cancelled') {
        setPhotoStatus('idle');
      } else if (result.outcome === 'denied') {
        settlePicked(null, result.messageAr);
      } else {
        settlePicked(result.photo, null);
      }
    })();
  }, [busyPhoto, settlePicked]);

  const takeWithCamera = useCallback(() => {
    if (busyPhoto) return;
    setPhotoStatus('picking');
    setPhotoError(null);
    void (async () => {
      const result = await takeProfilePhotoWithCamera();
      if (result.outcome === 'cancelled') {
        setPhotoStatus('idle');
      } else if (result.outcome === 'denied') {
        settlePicked(null, result.messageAr);
      } else {
        settlePicked(result.photo, null);
      }
    })();
  }, [busyPhoto, settlePicked]);

  const confirmPhotoUpload = useCallback(() => {
    if (pendingPhoto === null || photoStatus === 'uploading') return;
    setPhotoStatus('uploading');
    setPhotoError(null);
    setLastAction('upload');
    const photo = pendingPhoto;
    void (async () => {
      try {
        const updated = await source.uploadAvatar({ role: 'technician', photo });
        setProfile(updated);
        setPendingPhoto(null);
        setPhotoStatus('uploaded');
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'فشل رفع الصورة. حاول مجددًا.');
        setPhotoStatus('error');
      }
    })();
  }, [pendingPhoto, photoStatus, source]);

  const cancelPendingPhoto = useCallback(() => {
    setPendingPhoto(null);
    setPhotoStatus((s) => (s === 'uploading' || s === 'deleting' ? s : 'idle'));
    setPhotoError(null);
  }, []);

  const deletePhoto = useCallback(() => {
    if (photoStatus === 'uploading' || photoStatus === 'deleting') return;
    setPhotoStatus('deleting');
    setPhotoError(null);
    setLastAction('delete');
    void (async () => {
      try {
        const updated = await source.deleteAvatar({ role: 'technician' });
        setProfile(updated);
        setPhotoStatus('deleted');
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'فشل حذف الصورة. حاول مجددًا.');
        setPhotoStatus('error');
      }
    })();
  }, [photoStatus, source]);

  const retryPhoto = useCallback(() => {
    setPhotoStatus('idle');
    setPhotoError(null);
    if (lastAction === 'delete') {
      deletePhoto();
    } else if (lastAction === 'upload' && pendingPhoto !== null) {
      confirmPhotoUpload();
    }
  }, [lastAction, pendingPhoto, confirmPhotoUpload, deletePhoto]);

  const dismissPhotoStatus = useCallback(() => {
    setPhotoStatus('idle');
    setPhotoError(null);
    setLastAction(null);
  }, []);

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
    pendingPhoto,
    photoStatus,
    photoError,
    pickFromLibrary,
    takeWithCamera,
    confirmPhotoUpload,
    cancelPendingPhoto,
    deletePhoto,
    retryPhoto,
    dismissPhotoStatus,
  };
}
