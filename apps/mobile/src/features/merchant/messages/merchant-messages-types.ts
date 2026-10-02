/**
 * Merchant Messages — conversation list contracts (Phase D).
 *
 * Uses the shared conversation list endpoint (`GET /conversations`): the
 * merchant sees conversations they participate in (product inquiries).
 * Last message and unread count are real, server-computed values.
 */

export interface MerchantConversationItem {
  /** Real conversation id; the chat key is `conv-<id>`. */
  readonly id: string;
  readonly peerNameAr: string;
  readonly lastMessageAr: string | null;
  readonly unreadCount: number;
  readonly updatedAtAr: string;
  readonly productId: string | null;
}

export interface MerchantMessagesViewModel {
  readonly conversations: ReadonlyArray<MerchantConversationItem>;
}

export interface MerchantMessagesDataSource {
  getConversations(input: { role: 'merchant' }): Promise<MerchantMessagesViewModel>;
}
