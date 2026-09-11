/**
 * Notification endpoints (Task 10H). Source: docs/07_API.md §12.
 * Persistence + read-state APIs only — no delivery provider.
 */

import { paginationSchema } from '@khabir/shared-validation';
import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { NotificationsService } from './notifications.service';

import type { ApiMeta, ApiSuccess, NotificationDto } from '@khabir/shared-types';

@ApiTags('notifications')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token.')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('NotificationDto', 200, 'Own notifications (paginated, newest first).')
  async list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<NotificationDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.notifications.list(user.id, query);
    return { data: items, meta };
  }

  /** Recipient-only; idempotent; another user's notification ≡ 404. */
  @Post(':id/read')
  @HttpCode(200)
  @ApiEnvelopeOk('NotificationDto', 200, 'Notification marked read.')
  @ApiEnvelopeError(404, 'Notification not found or not owned by this recipient.')
  async markRead(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<NotificationDto>> {
    return { data: await this.notifications.markRead(user.id, id) };
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiEnvelopeOk('ReadAllResultDto', 200, 'All own unread notifications marked read.')
  async markAllRead(@CurrentUser() user: RequestUser): Promise<ApiSuccess<{ updated: number }>> {
    return { data: await this.notifications.markAllRead(user.id) };
  }
}
