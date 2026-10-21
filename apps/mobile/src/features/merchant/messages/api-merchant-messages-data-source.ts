/**
 * Real API `MerchantMessagesDataSource` (Phase D, WP-Inbox).
 *
 * GET /conversations (paginated) → the merchant's conversations (with
 * the real peer identity + avatar, last message + timestamp,
 * server-authoritative unread count, and product context). No fake data.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';

import type {
  MerchantConversationItem,
  MerchantMessagesDataSource,
  MerchantMessagesViewModel,
} from './merchant-messages-types';
import type { ConversationSummaryDto } from '@khabir/shared-types';

export function mapMerchantConversation(dto: ConversationSummaryDto): MerchantConversationItem {
  return {
    id: dto.id,
    peerNameAr: dto.peerNameAr,
    peerAvatarUrl: dto.peerAvatarUrl,
    lastMessageAr: dto.lastMessageAr,
    unreadCount: dto.unreadCount,
    updatedAtAr: formatArDateTime(dto.lastMessageAt ?? dto.updatedAt),
    productId: dto.productId,
    contextTitleAr: dto.contextTitleAr,
  };
}

export class ApiMerchantMessagesDataSource implements MerchantMessagesDataSource {
  async getConversations(_input: { role: 'merchant' }): Promise<MerchantMessagesViewModel> {
    const dtos = await drainPages<ConversationSummaryDto>((page, limit) =>
      getApi()
        .request<ConversationSummaryDto[]>('GET', `/conversations${buildQuery({ page, limit })}`)
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    return { conversations: dtos.map(mapMerchantConversation) };
  }
}
