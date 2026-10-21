/**
 * Chat service (Task 10H; extended for merchant product conversations, Phase D).
 * Source: docs/07_API.md §11; docs/06_DATABASE.md §15.
 *
 * Architecture: ONE shared chat domain. A conversation is scoped to EITHER:
 *   • a service request (participants = the request customer + technician), OR
 *   • a product (participants = the initiating customer/technician + the
 *     merchant who owns the product).
 * There are no arbitrary user-to-user conversations. Conversations are created
 * lazily on first access.
 *
 * Authorization is enforced server-side:
 *   • service-request conversations → membership derived from the request,
 *   • product conversations → the caller must hold a participant row.
 * Speaking (send) always uses the verified JWT subject as sender.
 *
 * NO realtime: HTTP persistence/read/send only. Opening a conversation marks
 * the peer's messages read (server-authoritative unread counts).
 */

import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { ConversationDto, ConversationSummaryDto, MessageDto } from './types';
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

/** Arabic label for a peer participant role (no invented identity). */
function peerLabelForRole(roleSnapshot: string | null): string {
  if (roleSnapshot === 'technician') return 'فني';
  return 'عميل';
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
  ): Promise<
    Prisma.ServiceRequestGetPayload<{
      select: { id: true; customerId: true; technicianId: true; status: true };
    }>
  > {
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
    requestStatus: ServiceRequestStatus | null,
  ): Promise<ConversationDto> {
    const row = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { id: true, serviceRequestId: true, productId: true, createdAt: true },
    });
    return {
      id: row.id,
      serviceRequestId: row.serviceRequestId,
      productId: row.productId,
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
    const technicianProfile =
      request.technicianId === null
        ? null
        : await this.prisma.technicianProfile.findFirst({
            where: { id: request.technicianId },
            select: { userId: true },
          });
    const created = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { serviceRequestId },
      });
      const participants: Array<{ conversationId: string; userId: string; roleSnapshot: string }> =
        [{ conversationId: conversation.id, userId: request.customerId, roleSnapshot: 'customer' }];
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

  /**
   * Returns (or lazily creates) the caller's conversation with the merchant
   * who owns `productId`. Customers and technicians may initiate; the
   * merchant is the other participant. Idempotent per (product, initiator).
   */
  async getForProduct(user: RequestUserRef, productId: string): Promise<ConversationDto> {
    if (user.role !== 'customer' && user.role !== 'technician') {
      // Only the buyer side initiates a product conversation.
      throw new NotFoundException('Conversation not found');
    }
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'active' },
      select: { id: true, merchantId: true },
    });
    if (product === null) {
      throw new NotFoundException('Product not found');
    }
    const merchant = await this.prisma.merchantProfile.findFirst({
      where: { id: product.merchantId },
      select: { userId: true },
    });
    if (merchant === null) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: { productId, initiatorUserId: user.id },
      select: { id: true },
    });
    if (existing !== null) {
      return this.conversationDto(existing.id, null);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { productId, initiatorUserId: user.id },
      });
      await tx.conversationParticipant.create({
        data: { conversationId: conversation.id, userId: user.id, roleSnapshot: user.role },
      });
      await tx.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: merchant.userId,
          roleSnapshot: 'merchant',
        },
      });
      return conversation;
    });
    return this.conversationDto(created.id, null);
  }

  /**
   * The caller's conversations (any type), newest activity first.
   * Paginated (docs/07_API.md §19): the inbox list is bounded per page;
   * per-conversation enrichment stays a bounded fan-out (limit ≤ 100).
   */
  async listConversations(
    user: RequestUserRef,
    query: { page: number; limit: number },
  ): Promise<{ items: ConversationSummaryDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      select: { conversationId: true },
    });
    const ids = participations.map((p) => p.conversationId);
    if (ids.length === 0) {
      return { items: [], meta: buildPageMeta(query.page, query.limit, 0) };
    }
    const where: Prisma.ConversationWhereInput = { id: { in: ids } };
    const [total, conversations] = await Promise.all([
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: { id: true, serviceRequestId: true, productId: true, updatedAt: true },
      }),
    ]);
    const items = await Promise.all(conversations.map((c) => this.summaryFor(user, c)));
    return { items, meta: buildPageMeta(query.page, query.limit, total) };
  }

  private async summaryFor(
    user: RequestUserRef,
    conversation: {
      id: string;
      serviceRequestId: string | null;
      productId: string | null;
      updatedAt: Date;
    },
  ): Promise<ConversationSummaryDto> {
    const [participants, lastMessage, unreadCount] = await Promise.all([
      this.prisma.conversationParticipant.findMany({
        where: { conversationId: conversation.id },
        select: { userId: true, roleSnapshot: true },
      }),
      this.prisma.message.findFirst({
        where: { conversationId: conversation.id },
        orderBy: [{ createdAt: 'desc' }],
        select: { body: true, createdAt: true },
      }),
      this.prisma.message.count({
        where: { conversationId: conversation.id, readAt: null, senderUserId: { not: user.id } },
      }),
    ]);

    const peer = participants.find((p) => p.userId !== user.id) ?? null;
    const peerIdentity = await this.resolvePeerIdentity(user, conversation, peer?.userId ?? null);

    return {
      id: conversation.id,
      peerNameAr: peerIdentity.nameAr,
      peerAvatarUrl: peerIdentity.avatarUrl,
      lastMessageAr: lastMessage?.body ?? null,
      lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
      unreadCount,
      productId: conversation.productId,
      serviceRequestId: conversation.serviceRequestId,
      contextTitleAr: peerIdentity.contextTitleAr,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  /**
   * Real other-party identity for the inbox (WP-Inbox).
   *
   * Rules (no invented names, privacy-preserving):
   * - service-request thread viewed by the customer → the technician's
   *   real displayName (+ avatar); fallback 'فني'.
   * - service-request thread viewed by the technician → generic 'عميل'
   *   (no customer name exists) + the customer's avatar when set.
   * - product thread viewed by the initiator (customer/technician) →
   *   the merchant's businessName (+ logo).
   * - product thread viewed by the merchant → the initiator: technician
   *   displayName (+ avatar), or generic 'عميل' (+ avatar) for customers.
   * - contextTitleAr: the order title/description or the product name —
   *   the row subtitle, read from the server (never fabricated).
   */
  private async resolvePeerIdentity(
    user: RequestUserRef,
    conversation: { serviceRequestId: string | null; productId: string | null },
    peerUserId: string | null,
  ): Promise<{ nameAr: string; avatarUrl: string | null; contextTitleAr: string | null }> {
    if (conversation.serviceRequestId !== null) {
      const request = await this.prisma.serviceRequest.findFirst({
        where: { id: conversation.serviceRequestId },
        select: {
          customerId: true,
          technicianId: true,
          problemTitle: true,
          problemDescription: true,
        },
      });
      const contextTitleAr = request?.problemTitle ?? request?.problemDescription ?? null;
      if (user.role === 'customer') {
        if (request?.technicianId !== null && request?.technicianId !== undefined) {
          const tech = await this.prisma.technicianProfile.findFirst({
            where: { id: request.technicianId },
            select: { displayName: true, avatarUrl: true },
          });
          return {
            nameAr: tech?.displayName ?? 'فني',
            avatarUrl: tech?.avatarUrl ?? null,
            contextTitleAr,
          };
        }
        return { nameAr: 'فني', avatarUrl: null, contextTitleAr };
      }
      if (user.role === 'technician') {
        const customer = await this.prisma.customerProfile.findFirst({
          where: { userId: request?.customerId ?? '' },
          select: { avatarUrl: true },
        });
        return { nameAr: 'عميل', avatarUrl: customer?.avatarUrl ?? null, contextTitleAr };
      }
      return { nameAr: peerLabelForRole(null), avatarUrl: null, contextTitleAr };
    }

    if (conversation.productId !== null) {
      const product = await this.prisma.product.findFirst({
        where: { id: conversation.productId },
        select: { nameAr: true, merchantId: true },
      });
      const contextTitleAr = product?.nameAr ?? null;
      if (user.role === 'merchant') {
        if (peerUserId === null) {
          return { nameAr: 'عميل', avatarUrl: null, contextTitleAr };
        }
        const peerUser = await this.prisma.user.findUnique({
          where: { id: peerUserId },
          select: { role: true },
        });
        if (peerUser?.role === 'technician') {
          const tech = await this.prisma.technicianProfile.findFirst({
            where: { userId: peerUserId },
            select: { displayName: true, avatarUrl: true },
          });
          return {
            nameAr: tech?.displayName ?? 'فني',
            avatarUrl: tech?.avatarUrl ?? null,
            contextTitleAr,
          };
        }
        const customer = await this.prisma.customerProfile.findFirst({
          where: { userId: peerUserId },
          select: { avatarUrl: true },
        });
        return { nameAr: 'عميل', avatarUrl: customer?.avatarUrl ?? null, contextTitleAr };
      }
      if (product !== null) {
        const merchant = await this.prisma.merchantProfile.findFirst({
          where: { id: product.merchantId },
          select: { businessName: true, logoUrl: true },
        });
        return {
          nameAr: merchant?.businessName ?? 'التاجر',
          avatarUrl: merchant?.logoUrl ?? null,
          contextTitleAr,
        };
      }
      return { nameAr: 'التاجر', avatarUrl: null, contextTitleAr };
    }

    return { nameAr: peerLabelForRole(null), avatarUrl: null, contextTitleAr: null };
  }

  /** Access check for message routes: participant-derived, IDOR-safe. */
  private async assertConversationAccess(
    user: RequestUserRef,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId },
      select: { id: true, serviceRequestId: true, productId: true },
    });
    if (conversation === null) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.serviceRequestId !== null) {
      await this.authorizeParticipant(user, conversation.serviceRequestId);
      return;
    }
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: user.id },
      select: { id: true },
    });
    if (participant === null) {
      throw new NotFoundException('Conversation not found');
    }
  }

  /**
   * Bounded, deterministic history (newest first; id tie-break). Opening the
   * conversation marks the peer's messages as read for truthful unread counts.
   */
  async listMessages(
    user: RequestUserRef,
    conversationId: string,
    query: { page: number; limit: number },
  ): Promise<{ items: MessageDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    await this.assertConversationAccess(user, conversationId);

    await this.prisma.message.updateMany({
      where: { conversationId, readAt: null, senderUserId: { not: user.id } },
      data: { readAt: new Date() },
    });

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
    await this.assertConversationAccess(user, conversationId);

    const row = await this.prisma.message.create({
      data: {
        conversationId,
        senderUserId: user.id,
        messageType: 'text',
        body: input.body,
      },
      select: MESSAGE_SELECT,
    });
    await this.prisma.conversation.updateMany({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
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
