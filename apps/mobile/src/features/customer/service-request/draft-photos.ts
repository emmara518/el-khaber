/**
 * Draft photo picking + validation for the service-request wizard (Track B2).
 *
 * Photos are picked locally BEFORE the request exists; bytes are uploaded
 * only after `POST /service-requests` returns an id. This module only picks
 * and validates — upload orchestration lives in `upload-request-photos.ts`.
 *
 * Client-side pre-checks mirror the server policy (5MB, JPEG/PNG/WebP) —
 * the server re-validates authoritatively at confirm time.
 */

import * as ImagePicker from 'expo-image-picker';

import { createDraftPhotoId } from './service-request-types';

import type { RequestAttachment } from './service-request-types';
import type { PickedPhoto } from '../../../lib/profile-photo';

export { createDraftPhotoId };

export const DRAFT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const DENIED_LIBRARY_AR = 'لم نتمكن من الوصول إلى مكتبة الصور. فعّل الإذن من إعدادات الجهاز.';
const DENIED_CAMERA_AR = 'لم نتمكن من الوصول إلى الكاميرا. فعّل الإذن من إعدادات الجهاز.';

export function draftPhotoSizeErrorAr(sizeBytes: number | null): string | null {
  if (sizeBytes === null) return null;
  return sizeBytes > DRAFT_PHOTO_MAX_BYTES
    ? 'حجم الصورة أكبر من ٥ ميجابايت. اختر صورة أصغر.'
    : null;
}

export function toRequestAttachment(
  picked: PickedPhoto,
  id: string = createDraftPhotoId(),
): RequestAttachment {
  return {
    id,
    uri: picked.uri,
    fileName: picked.fileName,
    mimeType: picked.mimeType,
    sizeBytes: picked.sizeBytes,
  };
}

export type DraftPhotoPickResult =
  | { readonly outcome: 'picked'; readonly photo: RequestAttachment }
  | { readonly outcome: 'cancelled' }
  | { readonly outcome: 'denied'; readonly messageAr: string }
  | { readonly outcome: 'tooLarge'; readonly messageAr: string };

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

async function finalize(result: ImagePicker.ImagePickerResult): Promise<DraftPhotoPickResult> {
  const first = result.assets?.[0];
  if (result.canceled || first === undefined || first === null) {
    return { outcome: 'cancelled' };
  }
  const mimeType = first.mimeType ?? 'image/jpeg';
  const picked: PickedPhoto = {
    uri: first.uri,
    fileName:
      first.fileName !== undefined && first.fileName !== null && first.fileName.length > 0
        ? first.fileName
        : `photo.${extensionForMime(mimeType)}`,
    mimeType,
    sizeBytes: first.fileSize ?? null,
  };
  const sizeError = draftPhotoSizeErrorAr(picked.sizeBytes);
  if (sizeError !== null) {
    return { outcome: 'tooLarge', messageAr: sizeError };
  }
  return { outcome: 'picked', photo: toRequestAttachment(picked) };
}

export async function pickDraftPhotoFromLibrary(): Promise<DraftPhotoPickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { outcome: 'denied', messageAr: DENIED_LIBRARY_AR };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });
  return finalize(result);
}

export async function takeDraftPhotoWithCamera(): Promise<DraftPhotoPickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { outcome: 'denied', messageAr: DENIED_CAMERA_AR };
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });
  return finalize(result);
}
