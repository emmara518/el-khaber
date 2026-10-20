import { describe, expect, it } from 'vitest';

import { mapInboxConversation } from './api-conversations-data-source';

import type { ConversationSummaryDto } from '@khabir/shared-types';

function dto(overrides: Partial<ConversationSummaryDto> = {}): ConversationSummaryDto {
  return {
    id: 'conv-1',
    peerNameAr: 'سامي الفني',
    peerAvatarUrl: 'https://cdn.example.com/avatars/t1/x.png',
    lastMessageAr: 'سأصل خلال نصف ساعة',
    lastMessageAt: '2026-02-01T10:05:00.000Z',
    unreadCount: 3,
    productId: null,
    serviceRequestId: 'req-1',
    contextTitleAr: 'الغسالة لا تعصر',
    updatedAt: '2026-02-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('mapInboxConversation (customer)', () => {
  it('maps the real peer, avatar, message, unread, and context', () => {
    const mapped = mapInboxConversation(dto());
    expect(mapped).toMatchObject({
      id: 'conv-1',
      technicianNameAr: 'سامي الفني',
      avatarUrl: 'https://cdn.example.com/avatars/t1/x.png',
      lastMessageAr: 'سأصل خلال نصف ساعة',
      unreadCount: 3,
      orderRefAr: 'الغسالة لا تعصر',
    });
    expect(mapped.initialsAr.length).toBeGreaterThan(0);
    expect(mapped.timeAr.length).toBeGreaterThan(0);
  });

  it('falls back to the thread timestamp and empty context honestly', () => {
    const mapped = mapInboxConversation(
      dto({ lastMessageAr: null, lastMessageAt: null, contextTitleAr: null, peerAvatarUrl: null }),
    );
    expect(mapped.lastMessageAr).toBeNull();
    expect(mapped.avatarUrl).toBeNull();
    expect(mapped.orderRefAr).toBe('');
    expect(mapped.timeAr.length).toBeGreaterThan(0);
  });
});
