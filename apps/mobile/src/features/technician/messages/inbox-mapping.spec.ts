import { describe, expect, it } from 'vitest';

import { mapTechnicianInboxConversation } from './api-technician-messages-data-source';

import type { ConversationSummaryDto } from '@khabir/shared-types';

function dto(overrides: Partial<ConversationSummaryDto> = {}): ConversationSummaryDto {
  return {
    id: 'conv-1',
    peerNameAr: 'عميل',
    peerAvatarUrl: null,
    lastMessageAr: 'مساعدة من فضلك',
    lastMessageAt: '2026-02-01T10:05:00.000Z',
    unreadCount: 1,
    productId: null,
    serviceRequestId: 'req-1',
    contextTitleAr: 'الثلاجة لا تبرد',
    updatedAt: '2026-02-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('mapTechnicianInboxConversation', () => {
  it('maps the real message, unread, avatar, and order context', () => {
    const mapped = mapTechnicianInboxConversation(dto());
    expect(mapped).toMatchObject({
      id: 'conv-1',
      peerNameAr: 'عميل',
      avatarUrl: null,
      lastMessageAr: 'مساعدة من فضلك',
      unreadCount: 1,
      orderRefAr: 'الثلاجة لا تبرد',
    });
    expect(mapped.initialsAr.length).toBeGreaterThan(0);
    expect(mapped.timeAr.length).toBeGreaterThan(0);
  });

  it('keeps an empty peer label honest with the privacy fallback', () => {
    const mapped = mapTechnicianInboxConversation(dto({ peerNameAr: '' }));
    expect(mapped.peerNameAr.length).toBeGreaterThan(0);
  });
});
