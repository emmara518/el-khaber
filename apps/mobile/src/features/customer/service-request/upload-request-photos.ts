/**
 * Request-photo upload orchestration (Track B2) — pure, injectable,
 * unit-tested. Runs AFTER the request was created: for every photo the
 * sequence is grant → raw PUT → confirm, strictly sequential (bounded
 * concurrency of 1 keeps progress honest and respects storage limits).
 *
 * A failed photo never throws: it is collected in `failed` so the caller
 * can keep the created request and offer a retry of exactly those photos.
 */

import type {
  ServiceRequestPhotoUploadGrant,
} from './mock-service-request-data-source';
import type { RequestAttachment } from './service-request-types';

export interface RequestPhotoUploader {
  requestPhotoUploadUrl(input: {
    requestId: string;
    mimeType: string;
  }): Promise<ServiceRequestPhotoUploadGrant>;
  putPhotoBytes(input: {
    grant: ServiceRequestPhotoUploadGrant;
    photo: RequestAttachment;
  }): Promise<void>;
  confirmPhoto(input: { requestId: string; storageKey: string }): Promise<void>;
}

export interface PhotoUploadProgress {
  readonly done: number;
  readonly total: number;
}

export interface PhotoUploadOutcome {
  readonly failed: ReadonlyArray<RequestAttachment>;
  readonly done: number;
}

export async function uploadRequestPhotos(input: {
  requestId: string;
  photos: ReadonlyArray<RequestAttachment>;
  uploader: RequestPhotoUploader;
  onProgress?: (progress: PhotoUploadProgress) => void;
}): Promise<PhotoUploadOutcome> {
  const failed: RequestAttachment[] = [];
  const total = input.photos.length;
  let done = 0;
  input.onProgress?.({ done: 0, total });
  for (const photo of input.photos) {
    try {
      const grant = await input.uploader.requestPhotoUploadUrl({
        requestId: input.requestId,
        mimeType: photo.mimeType,
      });
      await input.uploader.putPhotoBytes({ grant, photo });
      await input.uploader.confirmPhoto({
        requestId: input.requestId,
        storageKey: grant.storageKey,
      });
      done += 1;
    } catch {
      failed.push(photo);
    }
    input.onProgress?.({ done, total });
  }
  return { failed, done };
}
