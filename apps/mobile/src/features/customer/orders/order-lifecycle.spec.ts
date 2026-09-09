/**
 * Batch E tests: confirmation model, timeline presentation, chat
 * flow, rating flow, navigation handoffs. No invented states — the
 * lifecycle is the documented pending→accepted→on_the_way→
 * in_progress→completed (+cancelled) enum.
 */

import { describe, expect, it } from 'vitest';

import {
  markMessage,
  withPendingMessage,
} from '../chat/chat-types';
import { ChatSendError, MockChatDataSource } from '../chat/mock-chat-data-source';
import { useChatViewModel } from '../chat/use-chat-view-model';
import { MockRatingDataSource, RatingSubmitError } from '../rating/mock-rating-data-source';
import {
  toggleTag,
  validateRating,
} from '../rating/rating-types';
import { useRatingViewModel } from '../rating/use-rating-view-model';

import { MockOrderDataSource } from './mock-order-data-source';
import {
  buildTimeline,
  nextStepTitle,
} from './order-detail-types';
import { useOrderViewModel } from './use-order-view-model';

describe('request confirmation model', () => {
  it('resolves the fresh Batch-D submission id to a pending order', async () => {
    const detail = await new MockOrderDataSource().getOrderDetail({
      role: 'customer',
      requestId: 'REQ-2026-0481',
    });
    expect(detail?.status).toBe('pending');
    expect(detail?.technicianId).toBe('tech-2');
  });

  it('returns null for unknown ids (missing state)', async () => {
    expect(
      await new MockOrderDataSource().getOrderDetail({ role: 'customer', requestId: 'nope' }),
    ).toBeNull();
  });

  it('keeps Batch-A request identities in the detail fixture', async () => {
    for (const id of ['order-001', 'order-002', 'order-003', 'order-004', 'order-005']) {
      const detail = await new MockOrderDataSource().getOrderDetail({ role: 'customer', requestId: id });
      expect(detail?.requestId).toBe(id);
    }
  });

  it('exposes the order view-model hook', () => {
    expect(typeof useOrderViewModel).toBe('function');
  });
});

describe('tracking timeline presentation', () => {
  it('marks done/current/upcoming around the current status', () => {
    const steps = buildTimeline('on_the_way', { pending: 'ص', accepted: 'ص' });
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
  });

  it('completes every step for completed orders', () => {
    const steps = buildTimeline('completed', {
      pending: 'x', accepted: 'x', on_the_way: 'x', in_progress: 'x', completed: 'x',
    });
    expect(steps.every((s) => s.state === 'done')).toBe(true);
  });

  it('never invents timestamps — absent means null', () => {
    const steps = buildTimeline('pending', {});
    expect(steps.every((s) => s.atAr === null)).toBe(true);
    expect(steps[0].state).toBe('current');
  });

  it('renders cancelled without a current step', () => {
    const steps = buildTimeline('cancelled', { pending: 'x' });
    expect(steps.some((s) => s.state === 'current')).toBe(false);
    expect(steps.filter((s) => s.state === 'done')).toHaveLength(1);
  });

  it('uses only the five documented stages', () => {
    const steps = buildTimeline('pending', {});
    expect(steps.map((s) => s.status)).toEqual(
      ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed'],
    );
    expect(steps.map((s) => s.titleAr)).toEqual(
      ['تم الطلب', 'تم قبول الطلب', 'الفني في الطريق', 'قيد التنفيذ', 'تم الإنجاز'],
    );
  });

  it('announces the next expected step (null when terminal)', () => {
    expect(nextStepTitle('pending')).toContain('تم قبول الطلب');
    expect(nextStepTitle('in_progress')).toContain('تم الإنجاز');
    expect(nextStepTitle('completed')).toBeNull();
    expect(nextStepTitle('cancelled')).toBeNull();
  });
});

describe('chat message flow', () => {
  it('loads deterministic history preserving conversation identity', async () => {
    const history = await new MockChatDataSource().getMessages({
      role: 'customer',
      conversationId: 'req-chat-order-001',
    });
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((m) => m.conversationId === 'req-chat-order-001')).toBe(true);
  });

  it('echoes a pending message then resolves it on send', async () => {
    const source = new MockChatDataSource();
    const history = await source.getMessages({ role: 'customer', conversationId: 'c1' });
    const { next, pendingId } = withPendingMessage(history, 'c1', 'مرحبًا');
    const pending = next.find((m) => m.id === pendingId);
    expect(pending?.status).toBe('sending');
    const sent = await source.sendMessage({ role: 'customer', conversationId: 'c1', textAr: 'مرحبًا' });
    const resolved = markMessage(next, pendingId, { id: sent.id, status: 'sent' });
    expect(resolved.find((m) => m.id === sent.id)?.status).toBe('sent');
    expect(resolved).toHaveLength(history.length + 1);
  });

  it('marks failures for retry without losing the text', async () => {
    const source = new MockChatDataSource({ mode: 'failing' });
    await expect(
      source.sendMessage({ role: 'customer', conversationId: 'c1', textAr: 'x' }),
    ).rejects.toBeInstanceOf(ChatSendError);
    const { next, pendingId } = withPendingMessage([], 'c1', 'نص مهم');
    const failed = markMessage(next, pendingId, { status: 'error' });
    expect(failed.find((m) => m.id === pendingId)?.textAr).toBe('نص مهم');
  });

  it('exposes the chat view-model hook', () => {
    expect(typeof useChatViewModel).toBe('function');
  });
});

describe('rating selection + validation + submission', () => {
  it('requires 1–5 stars', () => {
    expect(validateRating(null)).not.toBeNull();
    expect(validateRating(0)).not.toBeNull();
    expect(validateRating(6)).not.toBeNull();
    expect(validateRating(4)).toBeNull();
  });

  it('toggles tags without duplication', () => {
    expect(toggleTag([], 'احترافية')).toEqual(['احترافية']);
    expect(toggleTag(['احترافية'], 'احترافية')).toEqual([]);
  });

  it('submits the exact review payload once', async () => {
    const source = new MockRatingDataSource();
    await source.submitRating({
      requestId: 'order-004',
      technicianId: 'tech-3',
      stars: 5,
      tags: ['احترافية'],
      commentAr: 'ممتاز',
    });
    expect(source.submitted).toHaveLength(1);
    expect(source.submitted[0]).toEqual({
      requestId: 'order-004',
      technicianId: 'tech-3',
      stars: 5,
      tags: ['احترافية'],
      commentAr: 'ممتاز',
    });
  });

  it('rejects invalid payloads and failing mode without faking success', async () => {
    const source = new MockRatingDataSource();
    await expect(
      source.submitRating({ requestId: 'order-004', technicianId: 'tech-3', stars: 0, tags: [], commentAr: '' }),
    ).rejects.toBeInstanceOf(RatingSubmitError);
    await expect(
      new MockRatingDataSource('failing').submitRating({
        requestId: 'order-004', technicianId: 'tech-3', stars: 5, tags: [], commentAr: '',
      }),
    ).rejects.toBeInstanceOf(RatingSubmitError);
    expect(source.submitted).toHaveLength(0);
  });

  it('exposes the rating view-model hook', () => {
    expect(typeof useRatingViewModel).toBe('function');
  });
});
