/**
 * Chat endpoints (Task 10H). Source: docs/07_API.md §11.
 * Any authenticated role may act ONLY as an authorized participant —
 * membership is derived from the service request, server-side.
 */

import { sendMessageSchema, paginationSchema, type SendMessageInput } from '@khabir/shared-validation';
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody, ApiZodQuery } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { ChatService } from './chat.service';

import type { ApiMeta, ApiSuccess, ConversationDto, MessageDto } from '@khabir/shared-types';

@ApiTags('chat')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token.')
@ApiEnvelopeError(404, 'Conversation not found or not a participant (identical response).')
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** Documented flow: Tracking/Active Service → Chat (lazy conversation). */
  @Get('service-requests/:id/conversation')
  @ApiEnvelopeOk('ConversationDto', 200, 'Authorized conversation (lazily created on first access).')
  async getForRequest(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<ConversationDto>> {
    return { data: await this.chat.getForRequest({ id: user.id, role: user.role }, id) };
  }

  @Get('conversations/:id/messages')
  @ApiZodQuery(paginationSchema)
  @ApiEnvelopeOk('MessageDto', 200, 'Bounded message history (newest first).')
  async listMessages(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(paginationSchema)) query: { page: number; limit: number },
  ): Promise<ApiSuccess<MessageDto[]> & { meta: ApiMeta }> {
    const { items, meta } = await this.chat.listMessages(
      { id: user.id, role: user.role },
      id,
      query,
    );
    return { data: items, meta };
  }

  @Post('conversations/:id/messages')
  @HttpCode(201)
  @ApiZodBody(sendMessageSchema)
  @ApiEnvelopeOk('MessageDto', 201, 'Message created; sender = verified JWT subject.')
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ): Promise<ApiSuccess<MessageDto>> {
    return { data: await this.chat.sendMessage({ id: user.id, role: user.role }, id, body) };
  }
}
