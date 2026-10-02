/**
 * Real API `MerchantMessagesDataSource` (Phase D).
 *
 * GET /conversations → the merchant's conversations (with the real last
 * message and server-authoritative unread count). No fake data.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';

import type { MerchantConversationItem, MerchantMessagesDataSource, MerchantMessagesViewModel } from './merchant-messages-types';
import type { ConversationSummaryDto } from '@khabir/shared-types';

export function mapMerchantConversation(dto: ConversationSummaryDto): MerchantConversationItem {
  return {
    id: dto.id,
    peerNameAr: dto.peerNameAr,
    lastMessageAr: dto.lastMessageAr,
    unreadCount: dto.unreadCount,
    updatedAtAr: formatArDateTime(dto.updatedAt),
    productId: dto.productId,
  };
}

export class ApiMerchantMessagesDataSource implements MerchantMessagesDataSource {
  async getConversations(_input: { role: 'merchant' }): Promise<MerchantMessagesViewModel> {
    const res = await getApi().request<ConversationSummaryDto[]>('GET', '/conversations');
    return { conversations: res.data.map(mapMerchantConversation) };
  }
}
