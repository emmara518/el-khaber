/**
 * Mock `ChatDataSource` (Batch E).
 *
 * Deterministic seeds per conversation (technician greeting +
 * customer reply). `sendMessage` echoes back a deterministic sent
 * message after a short delay — or throws in `failing` mode so the
 * error/retry path is verifiable. No persistence is claimed.
 */

import type { ChatDataSource, ChatMessage, ChatRole, ChatSender } from './chat-types';

export class ChatSendError extends Error {
  constructor(message = 'فشل إرسال الرسالة. تحقق من الاتصال وحاول مجددًا') {
    super(message);
    this.name = 'ChatSendError';
  }
}

const SEEDS: Record<string, ReadonlyArray<ChatMessage>> = {
  'req-chat-order-001': [
    {
      id: 'm1', conversationId: 'req-chat-order-001', sender: 'technician',
      textAr: 'أهلًا بك، فحصت الغسالة وبدأت العمل عليها الآن', timeAr: '١:٠٥ م', status: 'sent',
    },
    {
      id: 'm2', conversationId: 'req-chat-order-001', sender: 'customer',
      textAr: 'تمام، بانتظارك. هل تحتاج قطع غيار؟', timeAr: '١:١٠ م', status: 'sent',
    },
    {
      id: 'm3', conversationId: 'req-chat-order-001', sender: 'technician',
      textAr: 'لا، القطع المتوفرة تكفي. سأخبرك عند الانتهاء', timeAr: '١:١٢ م', status: 'sent',
    },
  ],
};

function seedFor(conversationId: string): ReadonlyArray<ChatMessage> {
  // Deterministic empty conversation (empty-state QA, both roles).
  if (conversationId.endsWith('-empty')) return [];
  const seed = SEEDS[conversationId];
  if (seed) return seed;
  return [
    {
      id: 'm1', conversationId, sender: 'technician',
      textAr: 'أهلًا بك، كيف أقدر أساعدك بخصوص طلبك؟', timeAr: '—', status: 'sent',
    },
  ];
}

export interface MockChatOptions {
  mode?: 'success' | 'failing';
  /** Who echoes in `sendMessage` (customer side → customer, technician side → technician). */
  sender?: ChatSender;
}

export class MockChatDataSource implements ChatDataSource {
  private sentCount = 0;

  constructor(private readonly options: MockChatOptions = {}) {}

  async getMessages(input: { role: ChatRole; conversationId: string }): Promise<ReadonlyArray<ChatMessage>> {
    void input.role;
    return JSON.parse(JSON.stringify(seedFor(input.conversationId))) as ReadonlyArray<ChatMessage>;
  }

  async sendMessage(input: { role: ChatRole; conversationId: string; textAr: string }): Promise<ChatMessage> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (this.options.mode === 'failing') throw new ChatSendError();
    this.sentCount += 1;
    return {
      id: `sent-${this.sentCount}`,
      conversationId: input.conversationId,
      sender: this.options.sender ?? 'customer',
      textAr: input.textAr,
      timeAr: 'الآن',
      status: 'sent',
    };
  }
}
