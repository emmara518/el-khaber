import { describe, expect, it } from 'vitest';

import {
  DRAFT_PHOTO_MAX_BYTES,
  createDraftPhotoId,
  draftPhotoSizeErrorAr,
  toRequestAttachment,
} from './draft-photos';

const PICKED = {
  uri: 'file:///tmp/img.jpg',
  fileName: 'img.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 2048,
} as const;

describe('draft photos (Track B2)', () => {
  it('mirrors the server 5MB cap and accepts unknown sizes (server decides)', () => {
    expect(DRAFT_PHOTO_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(draftPhotoSizeErrorAr(null)).toBeNull();
    expect(draftPhotoSizeErrorAr(DRAFT_PHOTO_MAX_BYTES)).toBeNull();
    expect(draftPhotoSizeErrorAr(DRAFT_PHOTO_MAX_BYTES + 1)).toContain('٥ ميجابايت');
  });

  it('maps a picked photo into a draft attachment without losing fields', () => {
    const attachment = toRequestAttachment(PICKED, 'p1');
    expect(attachment).toEqual({
      id: 'p1',
      uri: PICKED.uri,
      fileName: PICKED.fileName,
      mimeType: PICKED.mimeType,
      sizeBytes: PICKED.sizeBytes,
    });
  });

  it('generates unique ids for consecutive picks', () => {
    const ids = new Set([createDraftPhotoId(), createDraftPhotoId(), createDraftPhotoId()]);
    expect(ids.size).toBe(3);
  });
});
