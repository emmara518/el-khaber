/**
 * Batch A tests: conversations logic contracts.
 */

import { describe, expect, it } from 'vitest';

import { totalUnread } from './conversations-types';
import { MockConversationsDataSource } from './mock-conversations-data-source';

describe('conversations', () => {
  it('sums unread counts', async () => {
    const data = await new MockConversationsDataSource().getConversations({ role: 'customer' });
    expect(totalUnread(data.conversations)).toBe(2);
    expect(totalUnread([])).toBe(0);
  });

  it('returns threads with technician context and order refs', async () => {
    const data = await new MockConversationsDataSource().getConversations({ role: 'customer' });
    expect(data.conversations.length).toBeGreaterThan(0);
    for (const c of data.conversations) {
      expect(c.technicianNameAr.length).toBeGreaterThan(0);
      expect(c.lastMessageAr.length).toBeGreaterThan(0);
      expect(c.orderRefAr.length).toBeGreaterThan(0);
    }
  });
});
