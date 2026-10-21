/**
 * Test-only stub for `expo-file-system` (WP-Proof).
 *
 * The proof-upload flow PUTs bytes to a presigned URL through
 * `FileSystem.uploadAsync`; vitest runs in Node where the native
 * module cannot load. This stub answers success so unit tests exercise
 * the grant/confirm data-source logic without native code. Production
 * behavior is unchanged (the real module is used by the app).
 */

export const FileSystemUploadType = {
  BINARY_CONTENT: 0,
  MULTIPART: 1,
} as const;

export interface UploadResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export function uploadAsync(): Promise<UploadResult> {
  return Promise.resolve({ status: 200, body: '', headers: {} });
}
