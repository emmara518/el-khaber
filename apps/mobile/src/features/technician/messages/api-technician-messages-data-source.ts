/**
 * Real API `TechnicianMessagesDataSource` (T-G, WP-Inbox).
 *
 * Unified inbox: `GET /conversations` (paginated, drained bounded) —
 * the technician's participant-scoped threads with the real latest
 * message, server-authoritative unread count, and order context.
 * Opening a row resolves the thread directly (`conv-<id>`); no
 * conversation is created by listing.
 *
 * Honest field mapping: the counterparty label stays the generic
 * customer label (privacy by contract — no customer name exists).
 */

import { getApi } from '../../../lib/api-client';
import { formatArDateTime } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { CUSTOMER_NAME_FALLBACK_AR, initialsOf } from '../../../lib/request-labels';

import type {
  TechnicianConversationItem,
  TechnicianMessagesDataSource,
  TechnicianMessagesViewModel,
} from './technician-messages-types';
import type { ConversationSummaryDto } from '@khabir/shared-types';

export function mapTechnicianInboxConversation(
  dto: ConversationSummaryDto,
): TechnicianConversationItem {
  return {
    id: dto.id,
    peerNameAr: dto.peerNameAr.length > 0 ? dto.peerNameAr : CUSTOMER_NAME_FALLBACK_AR,
    initialsAr: initialsOf(dto.peerNameAr),
    avatarUrl: dto.peerAvatarUrl,
    lastMessageAr: dto.lastMessageAr,
    timeAr: formatArDateTime(dto.lastMessageAt ?? dto.updatedAt),
    unreadCount: dto.unreadCount,
    orderRefAr: dto.contextTitleAr ?? '',
  };
}

export class ApiTechnicianMessagesDataSource implements TechnicianMessagesDataSource {
  async getConversations(_input: { role: 'technician' }): Promise<TechnicianMessagesViewModel> {
    const dtos = await drainPages<ConversationSummaryDto>((page, limit) =>
      getApi()
        .request<ConversationSummaryDto[]>('GET', `/conversations${buildQuery({ page, limit })}`)
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    return { conversations: dtos.map(mapTechnicianInboxConversation) };
  }
}
