/**
 * Customer avatar endpoints (WP-01).
 *
 * POST /me/avatar — multipart upload of the caller's own profile photo.
 * DELETE /me/avatar — idempotent removal (absence is success).
 *
 * Customer-only (`@Roles('customer')`); identity comes from the verified
 * JWT — never from body/query. The stored value is always the
 * server-generated public URL; text PATCH of avatar URLs is no longer
 * accepted anywhere (D2).
 */

import { ERROR_CODE, type ApiSuccess } from '@khabir/shared-types';
import {
  Controller,
  Delete,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { ApiException } from '../common/errors';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk } from '../common/openapi/decorators';

import { AvatarUploadInterceptor } from './avatar-upload.interceptor';
import { AvatarService } from './avatar.service';

import type { AvatarUploadedFile } from './avatar.types';

@ApiTags('me')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or non-customer role.')
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeAvatarController {
  constructor(private readonly avatars: AvatarService) {}

  @Post('avatar')
  @HttpCode(201)
  @Roles('customer')
  @UseInterceptors(AvatarUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiEnvelopeOk('AvatarUploadDto', 201, 'Avatar uploaded; public URL persisted.')
  @ApiEnvelopeError(413, 'Image exceeds the maximum size.')
  @ApiEnvelopeError(429, 'Too many avatar uploads.')
  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: AvatarUploadedFile | undefined,
  ): Promise<ApiSuccess<{ avatarUrl: string }>> {
    if (file === undefined) {
      throw new ApiException(
        ERROR_CODE.UPLOAD_REJECTED,
        'Send one image in the `file` field.',
        400,
      );
    }
    const result = await this.avatars.uploadAvatar({
      userId: user.id,
      kind: 'customer',
      bytes: new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength),
      sizeBytes: file.size,
    });
    return { data: { avatarUrl: result.publicUrl } };
  }

  @Delete('avatar')
  @HttpCode(204)
  @Roles('customer')
  async deleteAvatar(@CurrentUser() user: RequestUser): Promise<void> {
    await this.avatars.deleteAvatar(user.id, 'customer');
  }
}
