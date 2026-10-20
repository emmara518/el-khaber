/**
 * Test-only stub for `expo-image-picker` (WP-01).
 *
 * The profile-photo chain (view-models → lib/profile-photo) imports
 * this native module; vitest runs in a Node environment where the
 * native picker (and its ESM build) cannot load. This stub mirrors the
 * permission + launch surface with deterministic denials/cancellation
 * so unit tests exercise the pure helpers without native code.
 * Production behavior is unchanged (the real module is used by the app).
 */

export const MediaTypeOptions = {
  All: 'All',
  Videos: 'Videos',
  Images: 'Images',
} as const;

export interface PermissionResponse {
  granted: boolean;
  canAskAgain: boolean;
}

export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse> {
  return Promise.resolve({ granted: false, canAskAgain: false });
}

export function requestCameraPermissionsAsync(): Promise<PermissionResponse> {
  return Promise.resolve({ granted: false, canAskAgain: false });
}

export interface ImagePickerAsset {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
}

export function launchImageLibraryAsync(): Promise<{ canceled: true; assets: [] }> {
  return Promise.resolve({ canceled: true as const, assets: [] });
}

export function launchCameraAsync(): Promise<{ canceled: true; assets: [] }> {
  return Promise.resolve({ canceled: true as const, assets: [] });
}
