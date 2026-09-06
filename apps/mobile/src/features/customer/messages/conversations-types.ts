/**
 * Customer Messages — conversation list contracts (Batch A).
 *
 * Batch A scope: the conversation LIST with read states. The chat
 * dialog (message history, composer, send) is Batch E and will reuse
 * these conversation identities.
 */

export interface ConversationItem {
  readonly id: string;
  readonly technicianNameAr: string;
  readonly initialsAr: string;
  readonly specialtyAr: string;
  readonly lastMessageAr: string;
  readonly timeAr: string;
  readonly unreadCount: number;
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
export function totalUnread(
  conversations: ReadonlyArray<ConversationItem>,
): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}
