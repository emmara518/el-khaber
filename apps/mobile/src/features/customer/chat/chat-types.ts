/**
 * Chat contracts + pure helpers (Batch E).
 *
 * Minimal model: id, conversation, sender, text, time, status.
 * No attachments, no read receipts, no typing indicators — the
 * product defines none of those.
 */

export type ChatSender = 'customer' | 'technician' | 'merchant';
export type ChatRole = 'customer' | 'technician' | 'merchant';
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
  getMessages(input: { role: ChatRole; conversationId: string }): Promise<ReadonlyArray<ChatMessage>>;
  sendMessage(input: { role: ChatRole; conversationId: string; textAr: string }): Promise<ChatMessage>;
}

/**
 * Append-local echo for the sending state (unit-tested).
 *
 * `sender` defaults to `'customer'` so existing callers are unchanged;
 * the Technician surface passes `'technician'` so the optimistic bubble
 * renders on the correct side.
 */
export function withPendingMessage(
  messages: ReadonlyArray<ChatMessage>,
  conversationId: string,
  textAr: string,
  sender: ChatSender = 'customer',
): { next: ReadonlyArray<ChatMessage>; pendingId: string } {
  const pendingId = `pending-${messages.length + 1}`;
  const pending: ChatMessage = {
    id: pendingId,
    conversationId,
    sender,
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

/**
 * Merge a polled server history into the local list.
 *
 * Server messages are authoritative and chronological. Local-only
 * messages (sending / failed echoes not yet persisted) are appended
 * after them. A local echo is dropped once the server lists a message
 * with the same side + text (count-matched), which prevents the brief
 * duplicate during the send/poll race.
 */
export function mergeChatMessages(
  current: ReadonlyArray<ChatMessage>,
  incoming: ReadonlyArray<ChatMessage>,
): ReadonlyArray<ChatMessage> {
  const serverIds = new Set(incoming.map((m) => m.id));
  const localOnly = current.filter((m) => m.status !== 'sent' && !serverIds.has(m.id));
  const unmatched = new Map<string, number>();
  for (const message of incoming) {
    const key = `${message.sender}\u0000${message.textAr}`;
    unmatched.set(key, (unmatched.get(key) ?? 0) + 1);
  }
  const kept: ChatMessage[] = [];
  for (const message of localOnly) {
    const key = `${message.sender}\u0000${message.textAr}`;
    const count = unmatched.get(key) ?? 0;
    if (count > 0) {
      unmatched.set(key, count - 1);
      continue;
    }
    kept.push(message);
  }
  return [...incoming, ...kept];
}
