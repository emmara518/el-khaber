import { describe, expect, it } from 'vitest';

import { mapMerchantConversation } from './api-merchant-messages-data-source';

import type { ConversationSummaryDto } from '@khabir/shared-types';

function dto(overrides: Partial<ConversationSummaryDto> = {}): ConversationSummaryDto {
  return {
    id: 'conv-1',
    peerNameAr: 'عميل',
    peerAvatarUrl: null,
    lastMessageAr: 'هل المنتج متوفر؟',
    lastMessageAt: '2026-02-01T10:05:00.000Z',
    unreadCount: 2,
    productId: 'p-1',
    serviceRequestId: null,
    contextTitleAr: 'فلتر تكييف',
    updatedAt: '2026-02-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('mapMerchantConversation', () => {
  it('maps the conversation summary to the list item', () => {
    const mapped = mapMerchantConversation(dto());
    expect(mapped).toMatchObject({
      id: 'conv-1',
      peerNameAr: 'عميل',
      peerAvatarUrl: null,
      lastMessageAr: 'هل المنتج متوفر؟',
      unreadCount: 2,
      productId: 'p-1',
      contextTitleAr: 'فلتر تكييف',
    });
    expect(mapped.updatedAtAr.length).toBeGreaterThan(0);
  });

  it('prefers the last-message timestamp over the thread timestamp', () => {
    const mapped = mapMerchantConversation(dto());
    const fallback = mapMerchantConversation(dto({ lastMessageAt: null }));
    expect(mapped.updatedAtAr).not.toBe(fallback.updatedAtAr);
  });

  it('preserves a truthful null last message and zero unread', () => {
    const mapped = mapMerchantConversation(dto({ lastMessageAr: null, unreadCount: 0 }));
    expect(mapped.lastMessageAr).toBeNull();
    expect(mapped.unreadCount).toBe(0);
  });
});
