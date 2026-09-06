/**
 * Chat contracts + pure helpers (Batch E).
 *
 * Minimal model: id, conversation, sender, text, time, status.
 * No attachments, no read receipts, no typing indicators — the
 * product defines none of those.
 */

export type ChatSender = 'customer' | 'technician';
export type ChatMessageStatus = 'sending' | 'sent' | 'error';

export interface ChatMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly sender: ChatSender;
  readonly textAr: string;
  readonly timeAr: string;
  readonly status: ChatMessageStatus;
}

export interface ChatDataSource {
  getMessages(input: { role: 'customer'; conversationId: string }): Promise<ReadonlyArray<ChatMessage>>;
  sendMessage(input: { role: 'customer'; conversationId: string; textAr: string }): Promise<ChatMessage>;
}

/** Append-local echo for the sending state (unit-tested). */
export function withPendingMessage(
  messages: ReadonlyArray<ChatMessage>,
  conversationId: string,
  textAr: string,
): { next: ReadonlyArray<ChatMessage>; pendingId: string } {
  const pendingId = `pending-${messages.length + 1}`;
  const pending: ChatMessage = {
    id: pendingId,
    conversationId,
    sender: 'customer',
    textAr,
    timeAr: 'الآن',
    status: 'sending',
  };
  return { next: [...messages, pending], pendingId };
}

export function markMessage(
  messages: ReadonlyArray<ChatMessage>,
  id: string,
  patch: Partial<Pick<ChatMessage, 'status' | 'id' | 'timeAr'>>,
): ReadonlyArray<ChatMessage> {
  return messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
}
