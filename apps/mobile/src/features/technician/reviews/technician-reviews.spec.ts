/**
 * T-E tests: shared chat domain (role parameter), technician
 * reviews contracts, deterministic seeds for every QA state.
 */

import { describe, expect, it } from 'vitest';

import { withPendingMessage } from '../../customer/chat/chat-types';
import { MockChatDataSource, ChatSendError } from '../../customer/chat/mock-chat-data-source';

import {
  MockTechnicianReviewsDataSource,
  type TechnicianReviewsDataSource,
} from './technician-reviews-types';
import { useTechnicianReviewsViewModel } from './use-technician-reviews-view-model';

describe('shared chat domain — technician role', () => {
  it('loads history and sends as technician on the same model', async () => {
    const source = new MockChatDataSource({ sender: 'technician' });
    const history = await source.getMessages({ role: 'technician', conversationId: 'req-chat-tin-003' });
    expect(history.length).toBeGreaterThan(0);
    const sent = await source.sendMessage({
      role: 'technician',
      conversationId: 'req-chat-tin-003',
      textAr: 'أنا في الطريق الآن',
    });
    expect(sent.sender).toBe('technician');
    expect(sent.status).toBe('sent');
    expect(sent.textAr).toBe('أنا في الطريق الآن');
  });

  it('supports deterministic empty conversations (empty-state QA)', async () => {
    const source = new MockChatDataSource({ sender: 'technician' });
    const history = await source.getMessages({
      role: 'technician',
      conversationId: 'req-chat-tin-003-empty',
    });
    expect(history).toHaveLength(0);
  });

  it('fails deterministically in failing mode without losing text', async () => {
    const source = new MockChatDataSource({ mode: 'failing', sender: 'technician' });
    await expect(
      source.sendMessage({ role: 'technician', conversationId: 'c1', textAr: 'نص محفوظ' }),
    ).rejects.toBeInstanceOf(ChatSendError);
    const { next, pendingId } = withPendingMessage([], 'c1', 'نص محفوظ');
    expect(next.find((m) => m.id === pendingId)?.textAr).toBe('نص محفوظ');
  });
});

describe('technician reviews', () => {
  it('returns summary + individual reviews (no invented metrics)', async () => {
    const data = await new MockTechnicianReviewsDataSource().getReviews({ role: 'technician' });
    expect(data.rating).toBe(4.9);
    expect(data.reviewCount).toBe(213);
    expect(data.reviews.length).toBeGreaterThan(0);
    for (const review of data.reviews) {
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
      expect(review.authorAr.length).toBeGreaterThan(0);
      expect(review.textAr.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(data)).not.toContain('score');
    expect(JSON.stringify(data)).not.toContain('percentage');
  });

  it('seeds zero reviews deterministically (empty state)', async () => {
    const data = await new MockTechnicianReviewsDataSource('no_reviews').getReviews({
      role: 'technician',
    });
    expect(data.reviews).toHaveLength(0);
    expect(data.reviewCount).toBe(0);
  });

  it('fails deterministically in failing mode (error/retry QA)', async () => {
    const source: TechnicianReviewsDataSource = new MockTechnicianReviewsDataSource('failing');
    await expect(source.getReviews({ role: 'technician' })).rejects.toThrow('تعذر تحميل التقييمات');
  });

  it('exposes the view-model hook', () => {
    expect(typeof useTechnicianReviewsViewModel).toBe('function');
  });
});
