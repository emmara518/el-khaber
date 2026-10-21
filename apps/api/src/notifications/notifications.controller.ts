/**
 * Notification endpoints (Task 10H + WP-Notifications).
 * Source: docs/07_API.md §12.
 * Persistence + read-state + preferences APIs only — no delivery provider.
 */

import { notificationPreferencesSchema, paginationSchema } from '@khabir/shared-validation';
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { NotificationsService } from './notifications.service';

import type {
  ApiMeta,
  ApiSuccess,
  NotificationDto,
  NotificationPreferencesDto,
  UnreadCountDto,
} from '@khabir/shared-types';
import type { NotificationPreferencesInput } from '@khabir/shared-validation';

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

  /**
   * WP-Notifications: server-authoritative unread count for the badge.
   * Static route — must stay distinct from `GET /notifications` (list).
   */
  @Get('unread-count')
  @ApiEnvelopeOk('UnreadCountDto', 200, 'Own unread notification count.')
  async unreadCount(@CurrentUser() user: RequestUser): Promise<ApiSuccess<UnreadCountDto>> {
    return { data: await this.notifications.getUnreadCount(user.id) };
  }

  /**
   * WP-Notifications: read the caller's delivery preferences.
   * Absent row ≡ all ON (server defaults, documented in docs/07 §12).
   */
  @Get('preferences')
  @ApiEnvelopeOk('NotificationPreferencesDto', 200, 'Own notification delivery preferences.')
  async getPreferences(
    @CurrentUser() user: RequestUser,
  ): Promise<ApiSuccess<NotificationPreferencesDto>> {
    return { data: await this.notifications.getPreferences(user.id) };
  }

  /**
   * WP-Notifications: replace the caller's delivery preferences.
   * Both keys required; unknown keys stripped; `verification` + admin
   * operational messages stay MANDATORY (no key exists for them).
   */
  @Put('preferences')
  @ApiEnvelopeOk('NotificationPreferencesDto', 200, 'Updated notification delivery preferences.')
  async updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(notificationPreferencesSchema)) body: NotificationPreferencesInput,
  ): Promise<ApiSuccess<NotificationPreferencesDto>> {
    return { data: await this.notifications.updatePreferences(user.id, body) };
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
