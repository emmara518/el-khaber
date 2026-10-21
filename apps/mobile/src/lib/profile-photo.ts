/**
 * Shared profile-photo picking (WP-01, D5).
 *
 * Single home for `expo-image-picker` (SDK 52, v16.x — no SDK upgrade):
 * gallery pick + camera capture with Arabic permission messaging,
 * client-side 2MB pre-check (the server re-validates authoritatively),
 * and `FormData` building for `ApiClient.upload`.
 *
 * The native module is loaded LAZILY (dynamic import) so unit tests and
 * the web bundle never evaluate native code at import time.
 * Cancellation and permission denial are honest `null`/message results —
 * never exceptions the screens must guess about.
 */

import * as ImagePicker from 'expo-image-picker';

/** Must mirror the server cap (avatar.config.ts) — the server decides. */
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export interface PickedPhoto {
  readonly uri: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number | null;
}

export type PhotoPickResult =
  | { readonly outcome: 'picked'; readonly photo: PickedPhoto }
  | { readonly outcome: 'cancelled' }
  | { readonly outcome: 'denied'; readonly messageAr: string };

const DENIED_LIBRARY_AR = 'تم رفض الوصول إلى الصور. فعّل الإذن من إعدادات الجهاز ثم حاول مجددًا.';
const DENIED_CAMERA_AR = 'تم رفض الوصول إلى الكاميرا. فعّل الإذن من إعدادات الجهاز ثم حاول مجددًا.';

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function toPickedPhoto(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}): PickedPhoto {
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const fileName =
    asset.fileName !== undefined && asset.fileName !== null && asset.fileName.length > 0
      ? asset.fileName
      : `photo.${extensionForMime(mimeType)}`;
  return {
    uri: asset.uri,
    fileName,
    mimeType,
    sizeBytes: asset.fileSize ?? null,
  };
}

/** Client-side pre-check only — the server enforces the real limit. */
export function profilePhotoSizeErrorAr(sizeBytes: number | null): string | null {
  if (sizeBytes === null) return null;
  return sizeBytes > PROFILE_PHOTO_MAX_BYTES
    ? 'حجم الصورة أكبر من ٢ ميجابايت. اختر صورة أصغر.'
    : null;
}

export function buildAvatarFormData(photo: PickedPhoto): FormData {
  const form = new FormData();
  form.append('file', {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);
  return form;
}

export async function pickProfilePhotoFromLibrary(): Promise<PhotoPickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { outcome: 'denied', messageAr: DENIED_LIBRARY_AR };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) {
    return { outcome: 'cancelled' };
  }
  const first = result.assets[0];
  if (first === undefined) {
    return { outcome: 'cancelled' };
  }
  return { outcome: 'picked', photo: toPickedPhoto(first) };
}

export async function takeProfilePhotoWithCamera(): Promise<PhotoPickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { outcome: 'denied', messageAr: DENIED_CAMERA_AR };
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) {
    return { outcome: 'cancelled' };
  }
  const first = result.assets[0];
  if (first === undefined) {
    return { outcome: 'cancelled' };
  }
  return { outcome: 'picked', photo: toPickedPhoto(first) };
}
