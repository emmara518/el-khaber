/**
 * Avatar multipart interceptor (WP-01).
 *
 * Wraps the `FileInterceptor('file')` (single file, 2MB cap, image MIME
 * pre-filter) and maps multer TRANSPORT errors to the canonical envelope:
 * - LIMIT_FILE_SIZE → 413 UPLOAD_REJECTED,
 * - LIMIT_UNEXPECTED_FILE / LIMIT_FILE_COUNT → 400 UPLOAD_REJECTED.
 *
 * Thrown ApiExceptions propagate normally to the global
 * ApiExceptionFilter (unlike a rethrowing exception filter, which would
 * leave the request hanging). Byte-level authority stays in
 * `AvatarService` (magic bytes + sharp decode); this interceptor only
 * shapes transport errors.
 */

import { ERROR_CODE } from '@khabir/shared-types';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';

import { ApiException } from '../common/errors';
import { AVATAR_ALLOWED_MIME_TYPES } from '../storage/avatar-validation';
import { readAvatarStorageConfig } from '../storage/avatar.config';

const FIELD = 'file';

function multerCodeError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

function isMulterCode(error: unknown, code: string): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as { code?: unknown; message?: unknown };
  return record.code === code || record.message === code;
}

function mapTransportError(error: unknown): unknown {
  if (isMulterCode(error, 'LIMIT_FILE_SIZE')) {
    return new ApiException(
      ERROR_CODE.UPLOAD_REJECTED,
      'Image exceeds the maximum size of 2MB.',
      413,
    );
  }
  if (isMulterCode(error, 'LIMIT_UNEXPECTED_FILE') || isMulterCode(error, 'LIMIT_FILE_COUNT')) {
    return new ApiException(
      ERROR_CODE.UPLOAD_REJECTED,
      'Send exactly one image in the `file` field.',
      400,
    );
  }
  if (error instanceof HttpException && error.getStatus() === 413) {
    // @nestjs/platform-express converts multer's LIMIT_FILE_SIZE into a
    // PayloadTooLargeException (no error code) — normalize it to the
    // canonical contract so clients see UPLOAD_REJECTED, not
    // INTERNAL_ERROR.
    return new ApiException(
      ERROR_CODE.UPLOAD_REJECTED,
      'Image exceeds the maximum size of 2MB.',
      413,
    );
  }
  return error;
}

@Injectable()
export class AvatarUploadInterceptor implements NestInterceptor {
  private readonly delegate: NestInterceptor;

  constructor() {
    const { maxBytes } = readAvatarStorageConfig();
    const Mixin = FileInterceptor(FIELD, {
      limits: { files: 1, fileSize: maxBytes },
      fileFilter: (_req, file, cb) => {
        if (
          (AVATAR_ALLOWED_MIME_TYPES as readonly string[]).includes(
            (file.mimetype ?? '').toLowerCase(),
          )
        ) {
          cb(null, true);
        } else {
          cb(multerCodeError('LIMIT_UNEXPECTED_FILE') as never, false);
        }
      },
    });
    this.delegate = new Mixin();
  }

  /**
   * The multer mixin exposes an async `intercept` (Promise-based), not an
   * Observable pipeline: transport errors surface as promise rejections
   * and are mapped here. Handler/service errors never pass through this
   * method — they flow to the global filter untouched.
   */
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return (await this.delegate.intercept(context, next)) as unknown as Observable<unknown>;
    } catch (error) {
      throw mapTransportError(error);
    }
  }
}
