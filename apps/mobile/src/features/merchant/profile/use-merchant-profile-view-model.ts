/**
 * View-model hook for the merchant profile (view + edit + save) plus
 * the WP-01 store-logo flow (pick → preview → upload, delete with
 * confirm, retry on failure). Accepts a data-source override for
 * deterministic QA of every verification state.
 */

import { useCallback, useEffect, useState } from 'react';

import { toUserError, toUserMessage } from '../../../lib/api-error';
import {
  pickProfilePhotoFromLibrary,
  profilePhotoSizeErrorAr,
  takeProfilePhotoWithCamera,
  type PickedPhoto,
} from '../../../lib/profile-photo';

import { ApiMerchantProfileDataSource } from './api-merchant-profile-data-source';

import type {
  MerchantProfile,
  MerchantProfileDataSource,
  MerchantProfileDraft,
} from './merchant-profile-types';
import type { ProfilePhotoStatus } from '../../../ui/profile-photo-section';

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
  const [pendingPhoto, setPendingPhoto] = useState<PickedPhoto | null>(null);
  const [photoStatus, setPhotoStatus] = useState<ProfilePhotoStatus>('idle');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'upload' | 'delete' | null>(null);

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
        setLoadError(toUserError(err, 'تعذّر تحميل البيانات. حاول مرة أخرى.'));
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
          setSaveError(toUserMessage(err, 'فشل حفظ بيانات المتجر'));
          setSaveStatus('error');
        }
      })();
    },
    [stableSource, saveStatus],
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
        const updated = await stableSource.uploadLogo({ role: 'merchant', photo });
        setProfile(updated);
        setPendingPhoto(null);
        setPhotoStatus('uploaded');
      } catch (err) {
        setPhotoError(toUserMessage(err, 'فشل رفع الشعار. حاول مجددًا.'));
        setPhotoStatus('error');
      }
    })();
  }, [pendingPhoto, photoStatus, stableSource]);

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
        const updated = await stableSource.deleteLogo({ role: 'merchant' });
        setProfile(updated);
        setPhotoStatus('deleted');
      } catch (err) {
        setPhotoError(toUserMessage(err, 'فشل حذف الشعار. حاول مجددًا.'));
        setPhotoStatus('error');
      }
    })();
  }, [photoStatus, stableSource]);

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
