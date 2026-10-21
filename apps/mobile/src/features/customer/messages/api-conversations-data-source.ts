/**
 * Real API `ConversationsDataSource` (Task 10J, WP-Inbox).
 *
 * Unified inbox: `GET /conversations` (paginated, drained bounded) —
 * the server's participant-scoped threads with real peer identity,
 * latest message (+ timestamp), unread count, and thread context.
 * Opening a row resolves the thread directly (`conv-<id>`); no
 * conversation is created by listing.
 *
 * Honest field mapping: `online` has no presence API and stays false.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { initialsOf } from '../../../lib/request-labels';

import type {
  ConversationItem,
  ConversationsDataSource,
  ConversationsViewModel,
} from './conversations-types';
import type { ConversationSummaryDto } from '@khabir/shared-types';

export function mapInboxConversation(dto: ConversationSummaryDto): ConversationItem {
  return {
    id: dto.id,
    technicianNameAr: dto.peerNameAr,
    initialsAr: initialsOf(dto.peerNameAr),
    avatarUrl: dto.peerAvatarUrl,
    lastMessageAr: dto.lastMessageAr,
    timeAr: formatArDateTime(dto.lastMessageAt ?? dto.updatedAt),
    unreadCount: dto.unreadCount,
    orderRefAr: dto.contextTitleAr ?? '',
    online: false,
  };
}

export class ApiConversationsDataSource implements ConversationsDataSource {
  async getConversations(_input: { role: 'customer' }): Promise<ConversationsViewModel> {
    const dtos = await drainPages<ConversationSummaryDto>((page, limit) =>
      getApi()
        .request<ConversationSummaryDto[]>('GET', `/conversations${buildQuery({ page, limit })}`)
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    return { conversations: dtos.map(mapInboxConversation) };
  }
}
