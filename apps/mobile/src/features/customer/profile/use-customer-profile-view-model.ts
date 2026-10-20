/**
 * View-model hook for the Customer Profile screen.
 * Data lifecycle only (loading / loaded / error + retry) plus the WP-01
 * profile-photo flow (pick → preview → upload, delete with confirm,
 * retry on failure). Persistence always re-reads the server profile —
 * the UI never claims an unsaved local success.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  pickProfilePhotoFromLibrary,
  profilePhotoSizeErrorAr,
  takeProfilePhotoWithCamera,
  type PickedPhoto,
} from '../../../lib/profile-photo';

import { ApiCustomerProfileDataSource } from './api-customer-profile-data-source';

import type { CustomerProfileDataSource, CustomerProfileSummary } from './customer-profile-types';
import type { ProfilePhotoStatus } from '../../../ui/profile-photo-section';

export type CustomerProfileStatus = 'loading' | 'loaded' | 'error';

export interface CustomerProfileState {
  status: CustomerProfileStatus;
  data: CustomerProfileSummary | null;
  error: Error | null;
  retry: () => void;
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

export function useCustomerProfileViewModel(
  sourceOverride?: CustomerProfileDataSource,
): CustomerProfileState {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<CustomerProfileStatus>('loading');
  const [data, setData] = useState<CustomerProfileSummary | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [source] = useState<CustomerProfileDataSource>(
    () => sourceOverride ?? new ApiCustomerProfileDataSource(),
  );
  const [pendingPhoto, setPendingPhoto] = useState<PickedPhoto | null>(null);
  const [photoStatus, setPhotoStatus] = useState<ProfilePhotoStatus>('idle');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'upload' | 'delete' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    source
      .getProfile({ role: 'customer' })
      .then((profile) => {
        if (cancelled) return;
        setData(profile);
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
  }, [attempt, source]);

  const busyPhoto =
    photoStatus === 'picking' || photoStatus === 'uploading' || photoStatus === 'deleting';

  const pickFromLibrary = useCallback(() => {
    if (busyPhoto) return;
    setPhotoStatus('picking');
    setPhotoError(null);
    void (async () => {
      const result = await pickProfilePhotoFromLibrary();
      if (result.outcome === 'cancelled') {
        setPhotoStatus('idle');
        return;
      }
      if (result.outcome === 'denied') {
        setPhotoError(result.messageAr);
        setPhotoStatus('error');
        return;
      }
      const sizeError = profilePhotoSizeErrorAr(result.photo.sizeBytes);
      if (sizeError !== null) {
        setPhotoError(sizeError);
        setPhotoStatus('error');
        return;
      }
      setPendingPhoto(result.photo);
      setPhotoStatus('idle');
    })();
  }, [busyPhoto]);

  const takeWithCamera = useCallback(() => {
    if (busyPhoto) return;
    setPhotoStatus('picking');
    setPhotoError(null);
    void (async () => {
      const result = await takeProfilePhotoWithCamera();
      if (result.outcome === 'cancelled') {
        setPhotoStatus('idle');
        return;
      }
      if (result.outcome === 'denied') {
        setPhotoError(result.messageAr);
        setPhotoStatus('error');
        return;
      }
      const sizeError = profilePhotoSizeErrorAr(result.photo.sizeBytes);
      if (sizeError !== null) {
        setPhotoError(sizeError);
        setPhotoStatus('error');
        return;
      }
      setPendingPhoto(result.photo);
      setPhotoStatus('idle');
    })();
  }, [busyPhoto]);

  const confirmPhotoUpload = useCallback(() => {
    if (pendingPhoto === null || photoStatus === 'uploading') return;
    setPhotoStatus('uploading');
    setPhotoError(null);
    setLastAction('upload');
    const photo = pendingPhoto;
    void (async () => {
      try {
        const updated = await source.uploadAvatar({ role: 'customer', photo });
        setData(updated);
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
        const updated = await source.deleteAvatar({ role: 'customer' });
        setData(updated);
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

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    status,
    data,
    error,
    retry,
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
