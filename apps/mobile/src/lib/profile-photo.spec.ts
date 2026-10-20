/**
 * Profile-photo helper contract (WP-01).
 *
 * Pure parts only (size gate, FormData shape, permission-denied copy):
 * the native picker itself is exercised on device (Visual QA).
 */

import { describe, expect, it } from 'vitest';

import {
  PROFILE_PHOTO_MAX_BYTES,
  buildAvatarFormData,
  profilePhotoSizeErrorAr,
} from './profile-photo';

describe('profile photo pre-check (client-side only)', () => {
  it('caps uploads at 2MB like the server', () => {
    expect(PROFILE_PHOTO_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(profilePhotoSizeErrorAr(null)).toBeNull();
    expect(profilePhotoSizeErrorAr(1024)).toBeNull();
    expect(profilePhotoSizeErrorAr(2 * 1024 * 1024)).toBeNull();
    expect(profilePhotoSizeErrorAr(2 * 1024 * 1024 + 1)).toMatch(/٢ ميجابايت/);
  });
});

describe('avatar FormData', () => {
  it('carries the file under the `file` field', () => {
    const form = buildAvatarFormData({
      uri: 'file:///photo.jpg',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    });
    expect(form).toBeInstanceOf(FormData);
    expect(form.has('file')).toBe(true);
  });
});
