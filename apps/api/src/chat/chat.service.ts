/**
 * Chat service (Task 10H).
 * Source: docs/07_API.md §11; docs/06_DATABASE.md §15.
 *
 * Architecture: ONE shared chat domain. A conversation is 1:1 with a
 * service request; participants are the request's customer and the
 * targeted/assigned technician (role snapshots at join time). No arbitrary
 * user-to-user conversations exist. The conversation is created lazily on
 * first access (documented flow: Tracking/Active Service → Chat).
 *
 * Authorization: participant membership is derived server-side from the
 * request ownership/assignment — conversation IDs alone never grant access.
 * The message sender is ALWAYS the verified JWT subject.
 *
 * NO realtime: HTTP persistence/read/send only (Task 10H §10).
 */


import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';


import { PrismaService } from '../database/prisma.service';

import type { ConversationDto, MessageDto } from './types';
import type { SendMessageInput } from '@khabir/shared-validation';
import type { Prisma, ServiceRequestStatus } from '@prisma/client';


const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  senderUserId: true,
  messageType: true,
  body: true,
  createdAt: true,
} satisfies Prisma.MessageSelect;

interface RequestUserRef {
  id: string;
  role: 'customer' | 'technician' | 'merchant';
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTechnicianProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.technicianProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  /**
   * Participant check derived from the REQUEST (never from the
   * conversation id alone): the customer owner or the targeted/assigned
   * technician. Returns the request row when authorized.
   */
  private async authorizeParticipant(
    user: RequestUserRef,
    serviceRequestId: string,
  ): Promise<Prisma.ServiceRequestGetPayload<{ select: { id: true; customerId: true; technicianId: true; status: true } }>> {
    if (user.role === 'customer') {
      const request = await this.prisma.serviceRequest.findFirst({
        where: { id: serviceRequestId, customerId: user.id },
        select: { id: true, customerId: true, technicianId: true, status: true },
      });
      if (request !== null) {
        return request;
      }
      throw new NotFoundException('Conversation not found');
    }
    if (user.role === 'technician') {
      const profileId = await this.resolveTechnicianProfileId(user.id);
      if (profileId !== null) {
        const request = await this.prisma.serviceRequest.findFirst({
          where: { id: serviceRequestId, technicianId: profileId },
          select: { id: true, customerId: true, technicianId: true, status: true },
        });
        if (request !== null) {
          return request;
        }
      }
      throw new NotFoundException('Conversation not found');
    }
    // Merchants have no service-request participation.
    throw new NotFoundException('Conversation not found');
  }

  private async conversationDto(
    conversationId: string,
    requestStatus: ServiceRequestStatus,
  ): Promise<ConversationDto> {
    const row = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { id: true, serviceRequestId: true, createdAt: true },
    });
    return {
      id: row.id,
      serviceRequestId: row.serviceRequestId,
      requestStatus,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Returns the request's conversation, creating it (plus participant
   * rows) on first access. Lazy creation is the documented
   * Tracking/Active Service → Chat flow; no arbitrary conversations exist.
   */
  async getForRequest(user: RequestUserRef, serviceRequestId: string): Promise<ConversationDto> {
    const request = await this.authorizeParticipant(user, serviceRequestId);

    const existing = await this.prisma.conversation.findFirst({
      where: { serviceRequestId },
    });
    if (existing !== null) {
      return this.conversationDto(existing.id, request.status);
    }

    // Participants: the request customer + the request technician's account.
    const technicianProfile = await this.prisma.technicianProfile.findFirst({
      where: { id: request.technicianId ?? '__never__' },
      select: { userId: true },
    });
    const created = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { serviceRequestId },
      });
      const participants: Array<{ conversationId: string; userId: string; roleSnapshot: string }> = [
        { conversationId: conversation.id, userId: request.customerId, roleSnapshot: 'customer' },
      ];
      if (technicianProfile !== null) {
        participants.push({
          conversationId: conversation.id,
          userId: technicianProfile.userId,
          roleSnapshot: 'technician',
        });
      }
      for (const participant of participants) {
        await tx.conversationParticipant.create({ data: participant });
      }
      return conversation;
    });
    return this.conversationDto(created.id, request.status);
  }

  /** Bounded, deterministic history (newest first; id tie-break). */
  async listMessages(
    user: RequestUserRef,
    conversationId: string,
    query: { page: number; limit: number },
  ): Promise<{ items: MessageDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId },
      select: { serviceRequestId: true },
    });
    if (conversation === null) {
      throw new NotFoundException('Conversation not found');
    }
    await this.authorizeParticipant(user, conversation.serviceRequestId);

    const { page, limit } = query;
    const where: Prisma.MessageWhereInput = { conversationId };
    const [total, rows] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: MESSAGE_SELECT,
      }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        conversationId: r.conversationId,
        senderUserId: r.senderUserId,
        messageType: 'text' as const,
        body: r.body ?? '',
        createdAt: r.createdAt.toISOString(),
      })),
      meta: buildPageMeta(page, limit, total),
    };
  }

  /** Server-authoritative message creation: sender = verified JWT subject. */
  async sendMessage(
    user: RequestUserRef,
    conversationId: string,
    input: SendMessageInput,
  ): Promise<MessageDto> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId },
      select: { serviceRequestId: true },
    });
    if (conversation === null) {
      throw new NotFoundException('Conversation not found');
    }
    await this.authorizeParticipant(user, conversation.serviceRequestId);

    const row = await this.prisma.message.create({
      data: {
        conversationId,
        senderUserId: user.id,
        messageType: 'text',
        body: input.body,
      },
      select: MESSAGE_SELECT,
    });
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderUserId: row.senderUserId,
      messageType: 'text' as const,
      body: row.body ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }
}
