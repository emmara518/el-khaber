/**
 * Real API `ChatDataSource` (Task 10J) — request-scoped 1:1 chat.
 *
 * Endpoints (docs/07 §11, all authenticated, HTTP only — no realtime):
 * - GET /service-requests/:id/conversation — lazily-created 1:1
 *   conversation (participants derived server-side from the request),
 * - GET /conversations/:id/messages — newest-first paginated history,
 * - POST /conversations/:id/messages — send; sender identity is the
 *   verified JWT subject and is NEVER taken from the client payload.
 *
 * The existing UI opens the dialog with the tracking key
 * `req-chat-<requestId>` (Batch-E contract); this adapter resolves
 * that key to the real conversation server-side. Sender sides are
 * derived by comparing `senderUserId` with the signed-in user id from
 * the auth store — the server remains the sender authority.
 */

import { getApi } from '../../../lib/api-client';
import { formatArTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { useAuthStore } from '../../../lib/auth-store';

import { ChatSendError } from './mock-chat-data-source';

import type { ChatDataSource, ChatMessage, ChatRole } from './chat-types';
import type { ConversationDto, MessageDto } from '@khabir/shared-types';

export { ChatSendError };

const CHAT_KEY_PREFIX = 'req-chat-';
const LOAD_FALLBACK_AR = 'تعذر تحميل المحادثة. تحقق من الاتصال وحاول مجددًا';

/** Extract the service-request id from the UI conversation key. */
export function requestIdFromChatKey(conversationId: string): string {
  return conversationId.startsWith(CHAT_KEY_PREFIX)
    ? conversationId.slice(CHAT_KEY_PREFIX.length)
    : conversationId;
}

export class ApiChatDataSource implements ChatDataSource {
  private readonly conversations = new Map<string, Promise<ConversationDto>>();

  /** Resolve (and cache) the request's conversation. Real id only. */
  private conversationFor(requestId: string): Promise<ConversationDto> {
    const cached = this.conversations.get(requestId);
    if (cached !== undefined) return cached;
    const promise = getApi()
      .request<ConversationDto>('GET', `/service-requests/${requestId}/conversation`)
      .then((res) => res.data)
      .catch((err: unknown) => {
        this.conversations.delete(requestId); // allow retry on next call
        throw new ChatSendError(toLoadMessage(err));
      });
    this.conversations.set(requestId, promise);
    return promise;
  }

  async getMessages(input: {
    role: ChatRole;
    conversationId: string;
  }): Promise<ReadonlyArray<ChatMessage>> {
    void input.role;
    const requestId = requestIdFromChatKey(input.conversationId);
    const conversation = await this.conversationFor(requestId);
    try {
      const messages = await drainPages<MessageDto>((page, limit) =>
        getApi()
          .request<MessageDto[]>(
            'GET',
            `/conversations/${conversation.id}/messages${buildQuery({ page, limit })}`,
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      );
      const myUserId = useAuthStore.getState().user?.id ?? null;
      // API returns newest-first; the dialog renders oldest-first.
      return [...messages].reverse().map((dto) => this.toChatMessage(dto, input.role, myUserId, input.conversationId));
    } catch (err: unknown) {
      if (err instanceof ChatSendError) throw err;
      throw new ChatSendError(toLoadMessage(err));
    }
  }

  async sendMessage(input: {
    role: ChatRole;
    conversationId: string;
    textAr: string;
  }): Promise<ChatMessage> {
    const requestId = requestIdFromChatKey(input.conversationId);
    const conversation = await this.conversationFor(requestId);
    try {
      const res = await getApi().request<MessageDto>(
        'POST',
        `/conversations/${conversation.id}/messages`,
        // Sender identity is server-derived from the JWT (never sent).
        { body: input.textAr },
      );
      return this.toChatMessage(res.data, input.role, res.data.senderUserId, input.conversationId);
    } catch (err: unknown) {
      if (err instanceof ChatSendError) throw err;
      throw new ChatSendError(
        err instanceof Error && err.message.includes('2000')
          ? 'الرسالة أطول من الحد المسموح'
          : 'فشل إرسال الرسالة. تحقق من الاتصال وحاول مجددًا',
      );
    }
  }

  private toChatMessage(
    dto: MessageDto,
    role: ChatRole,
    myUserId: string | null,
    uiConversationId: string,
  ): ChatMessage {
    const mine = dto.senderUserId === myUserId;
    return {
      id: dto.id,
      conversationId: uiConversationId,
      // Own messages render on the signed-in side; the peer is the
      // other side of the 1:1 conversation (server-authorized).
      sender: mine ? role : role === 'customer' ? 'technician' : 'customer',
      textAr: dto.body,
      timeAr: formatArTime(dto.createdAt),
      status: 'sent',
    };
  }
}

function toLoadMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return LOAD_FALLBACK_AR;
}
