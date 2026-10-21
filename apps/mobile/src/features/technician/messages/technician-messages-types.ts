/**
 * Technician Messages — conversation list contracts (T-G, WP-Inbox).
 *
 * Backed by the real unified inbox (`GET /conversations`): the
 * technician sees their threads with the real latest message,
 * server-authoritative unread count, and order context.
 *
 * The counterparty is the customer, whose identity the API deliberately
 * does not expose (privacy by contract) — the honest generic label is
 * used, never an invented name.
 */

export interface TechnicianConversationItem {
  /** Real conversation id; the chat key is `conv-<id>`. */
  readonly id: string;
  readonly peerNameAr: string;
  readonly initialsAr: string;
  /** Customer avatar when set (null keeps the initials fallback). */
  readonly avatarUrl: string | null;
  /** Real latest message (null when the thread has no messages yet). */
  readonly lastMessageAr: string | null;
  readonly timeAr: string;
  readonly unreadCount: number;
  /** Thread context from the server (order title), never fabricated. */
  readonly orderRefAr: string;
}

export interface TechnicianMessagesViewModel {
  readonly conversations: ReadonlyArray<TechnicianConversationItem>;
}

export interface TechnicianMessagesDataSource {
  getConversations(input: { role: 'technician' }): Promise<TechnicianMessagesViewModel>;
}
