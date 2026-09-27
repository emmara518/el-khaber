import { describe, expect, it } from 'vitest';

import { CUSTOMER_NAME_FALLBACK_AR } from '../../../lib/request-labels';

import { useTechnicianMessagesViewModel } from './use-technician-messages-view-model';

import type { TechnicianMessagesDataSource } from './technician-messages-types';

describe('technician messages contract', () => {
  it('exposes the view-model hook', () => {
    expect(typeof useTechnicianMessagesViewModel).toBe('function');
  });

  it('keeps the privacy-safe counterparty label (no invented customer name)', () => {
    expect(CUSTOMER_NAME_FALLBACK_AR.trim().length).toBeGreaterThan(0);
    expect(/[\u0600-\u06FF]/.test(CUSTOMER_NAME_FALLBACK_AR)).toBe(true);
  });

  it('accepts any data source that satisfies the contract', async () => {
    const source: TechnicianMessagesDataSource = {
      async getConversations() {
        return {
          conversations: [
            {
              id: 'req-1',
              peerNameAr: CUSTOMER_NAME_FALLBACK_AR,
              initialsAr: 'ا',
              applianceAr: 'مكيف',
              lastMessageAr: '',
              timeAr: 'اليوم',
              orderRefAr: 'صيانة',
            },
          ],
        };
      },
    };
    const view = await source.getConversations({ role: 'technician' });
    expect(view.conversations).toHaveLength(1);
    expect(view.conversations[0]?.peerNameAr).toBe(CUSTOMER_NAME_FALLBACK_AR);
  });
});
