import { describe, expect, it } from 'vitest';

import { mapMerchantConversation } from './api-merchant-messages-data-source';

import type { ConversationSummaryDto } from '@khabir/shared-types';

function dto(overrides: Partial<ConversationSummaryDto> = {}): ConversationSummaryDto {
  return {
    id: 'conv-1',
    peerNameAr: 'عميل',
    lastMessageAr: 'هل المنتج متوفر؟',
    unreadCount: 2,
    productId: 'p-1',
    serviceRequestId: null,
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
      lastMessageAr: 'هل المنتج متوفر؟',
      unreadCount: 2,
      productId: 'p-1',
    });
    expect(mapped.updatedAtAr.length).toBeGreaterThan(0);
  });

  it('preserves a truthful null last message and zero unread', () => {
    const mapped = mapMerchantConversation(dto({ lastMessageAr: null, unreadCount: 0 }));
    expect(mapped.lastMessageAr).toBeNull();
    expect(mapped.unreadCount).toBe(0);
  });
});
