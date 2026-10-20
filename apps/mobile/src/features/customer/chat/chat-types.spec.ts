import { describe, expect, it } from 'vitest';

import { mergeChatMessages, type ChatMessage } from './chat-types';

function message(overrides: Partial<ChatMessage> & Pick<ChatMessage, 'id'>): ChatMessage {
  return {
    conversationId: 'c1',
    sender: 'customer',
    textAr: 'نص',
    timeAr: '١٠:٠٠',
    status: 'sent',
    ...overrides,
  };
}

describe('mergeChatMessages (Track B3)', () => {
  it('returns the polled history in server order when there is nothing local', () => {
    const incoming = [message({ id: 'm1' }), message({ id: 'm2', sender: 'technician' })];
    expect(mergeChatMessages([], incoming)).toEqual(incoming);
  });

  it('keeps in-flight and failed local echoes after the server history', () => {
    const current = [
      message({ id: 's1' }),
      message({ id: 'pending-2', status: 'sending', textAr: 'قيد الإرسال' }),
      message({ id: 'pending-3', status: 'error', textAr: 'فشل الإرسال' }),
    ];
    const incoming = [message({ id: 's1' })];
    const merged = mergeChatMessages(current, incoming);
    expect(merged.map((m) => m.id)).toEqual(['s1', 'pending-2', 'pending-3']);
  });

  it('drops a local echo once the server lists the same side and text (count-matched)', () => {
    const current = [
      message({ id: 'pending-1', status: 'sending', textAr: 'مرحبا' }),
      message({ id: 'pending-2', status: 'sending', textAr: 'مرحبا' }),
    ];
    const incoming = [message({ id: 'server-1', textAr: 'مرحبا' })];
    const merged = mergeChatMessages(current, incoming);
    expect(merged.map((m) => m.id)).toEqual(['server-1', 'pending-2']);
  });

  it('never hides an echo whose text came from the other side', () => {
    const current = [
      message({ id: 'pending-1', status: 'sending', textAr: 'تمام', sender: 'customer' }),
    ];
    const incoming = [message({ id: 'server-1', textAr: 'تمام', sender: 'technician' })];
    expect(mergeChatMessages(current, incoming).map((m) => m.id)).toEqual([
      'server-1',
      'pending-1',
    ]);
  });

  it('replaces a locally-sent message whose id already exists server-side', () => {
    const current = [message({ id: 's9', status: 'sending', textAr: 'قديم' })];
    const incoming = [message({ id: 's9', status: 'sent', textAr: 'قديم' })];
    const merged = mergeChatMessages(current, incoming);
    expect(merged).toEqual(incoming);
  });
});
