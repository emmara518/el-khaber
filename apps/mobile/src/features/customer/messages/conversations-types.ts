/**
 * Customer Messages — conversation list contracts (Batch A, WP-Inbox).
 *
 * The list is backed by the real unified inbox (`GET /conversations`):
 * server-computed peer identity, latest message, unread count, and
 * thread context. `online` has no presence API and stays an honest
 * false (the dot renders muted) rather than fabricated presence.
 */

export interface ConversationItem {
  /** Real conversation id; the chat key is `conv-<id>`. */
  readonly id: string;
  readonly technicianNameAr: string;
  readonly initialsAr: string;
  /** Server-issued public avatar URL (null when the peer has none). */
  readonly avatarUrl: string | null;
  /** Real latest message (null when the thread has no messages yet). */
  readonly lastMessageAr: string | null;
  readonly timeAr: string;
  readonly unreadCount: number;
  /** Thread context from the server (order title), never fabricated. */
  readonly orderRefAr: string;
  readonly online: boolean;
}

export interface ConversationsViewModel {
  readonly conversations: ReadonlyArray<ConversationItem>;
}

export interface ConversationsDataSource {
  getConversations(input: { role: 'customer' }): Promise<ConversationsViewModel>;
}

/** Pure helper — total unread badge count (unit-tested). */
export function totalUnread(conversations: ReadonlyArray<ConversationItem>): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}
