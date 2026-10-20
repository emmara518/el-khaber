/**
 * Shared avatar-upload transport types (WP-01).
 *
 * Minimal structural view of the single multipart file the avatar
 * endpoints accept. Only the fields the service reads are modeled —
 * the original client filename and declared MIME are intentionally
 * absent (never trusted).
 */

export interface AvatarUploadedFile {
  readonly buffer: Buffer;
  readonly size: number;
}
