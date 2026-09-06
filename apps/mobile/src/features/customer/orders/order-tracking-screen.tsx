/**
 * Order Tracking screen (Batch E).
 *
 * Header (request ref + status) → technician card (when assigned) →
 * timeline → next-step hint → contextual actions:
 * - active states: chat dialog entry (technician assigned only),
 * - completed: completion card + rating form,
 * - cancelled: terminal notice (no chat, no rating).
 * Chat opens as a dismissible dialog; closing returns to tracking.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../chat/chat-dialog';
import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';
import { RatingForm } from '../rating/rating-form';

import { nextStepTitle, type OrderDataSource, type OrderDetail } from './order-detail-types';
import { OrderTimeline } from './order-timeline';
import { useOrderViewModel } from './use-order-view-model';

import type { ChatDataSource } from '../chat/chat-types';
import type { RatingDataSource } from '../rating/rating-types';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card, SectionHeader, StatusBadge } from '@/ui';

export default function OrderTrackingScreen({
  requestId,
  orderSource,
  chatSource,
  ratingSource,
}: {
  requestId: string;
  orderSource?: OrderDataSource;
  chatSource?: ChatDataSource;
  ratingSource?: RatingDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useOrderViewModel(requestId, orderSource);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          title={t('tracking.error.title')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'missing' ? (
        <ListEmpty
          icon="📋"
          iconLabel="طلب غير موجود"
          title={t('tracking.missing.title')}
          body={t('tracking.missing.body')}
          actionLabel={t('tracking.missing.action')}
          onAction={() => router.replace('/(customer)/requests')}
        />
      ) : null}
      {status === 'loaded' && data !== null ? (
        <TrackingBody
          detail={data}
          chatOpen={chatOpen}
          onOpenChat={() => setChatOpen(true)}
          onCloseChat={() => setChatOpen(false)}
          chatSource={chatSource}
          ratingSource={ratingSource}
          onBackToRequests={() => router.replace('/(customer)/requests')}
        />
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function TrackingBody({
  detail,
  chatOpen,
  onOpenChat,
  onCloseChat,
  chatSource,
  ratingSource,
  onBackToRequests,
}: {
  detail: OrderDetail;
  chatOpen: boolean;
  onOpenChat: () => void;
  onCloseChat: () => void;
  chatSource?: ChatDataSource;
  ratingSource?: RatingDataSource;
  onBackToRequests: () => void;
}) {
  const { t } = useI18n();
  const next = nextStepTitle(detail.status);
  const chattable = detail.technicianId !== null && detail.status !== 'cancelled' && detail.status !== 'completed';

  return (
    <>
      <View style={styles.heading}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {t('tracking.title')}
          </Text>
          <Text style={styles.ref}>
            {t('tracking.ref')}: {detail.requestId}
          </Text>
        </View>
        <StatusBadge status={detail.status} label={detail.statusLabelAr} />
      </View>

      <Card background={color.surface.base} padded style={styles.summary}>
        <Text style={styles.task}>{detail.taskAr}</Text>
        <Text style={styles.meta}>
          {detail.applianceAr} · 📍 {detail.locationAr}
        </Text>
        {detail.appointmentAr !== null ? (
          <Text style={styles.meta}>📅 {detail.appointmentAr}</Text>
        ) : null}
      </Card>

      {detail.technicianId !== null ? (
        <Card background={color.surface.base} padded style={styles.tech}>
          <Avatar
            initials={detail.technicianInitialsAr}
            size={52}
            accessibilityLabel={detail.technicianNameAr}
          />
          <View style={styles.techText}>
            <Text style={styles.techLabel}>{t('tracking.technician')}</Text>
            <Text style={styles.techName}>{detail.technicianNameAr}</Text>
          </View>
        </Card>
      ) : (
        <Card background={color.brand.goldSoft} borderColor={color.brand.gold} padded>
          <Text style={styles.unassigned}>{t('tracking.unassigned')}</Text>
        </Card>
      )}

      <SectionHeader titleKey="tracking.timeline" />
      <OrderTimeline steps={detail.timeline} />
      {next !== null ? (
        <Text style={styles.next}>{next}</Text>
      ) : null}

      {detail.status === 'cancelled' ? (
        <Card background={color.error.soft} borderColor={color.error.DEFAULT} padded style={styles.notice}>
          <Text accessibilityRole="text" style={styles.cancelledText}>
            {t('tracking.cancelled')}
          </Text>
        </Card>
      ) : null}

      {chattable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`فتح المحادثة مع ${detail.technicianNameAr}`}
          onPress={onOpenChat}
          style={({ pressed }) => [styles.chat, pressed && styles.pressed]}
        >
          <Text style={styles.chatText}>💬 {t('tracking.chat')}</Text>
        </Pressable>
      ) : null}

      {detail.status === 'completed' && detail.technicianId !== null ? (
        <>
          <Card background={color.success.soft} borderColor={color.success.DEFAULT} padded style={styles.notice}>
            <Text accessibilityRole="header" style={styles.completedTitle}>
              {t('tracking.completed.title')}
            </Text>
            <Text style={styles.completedBody}>{t('tracking.completed.body')}</Text>
          </Card>
          <Card background={color.surface.base} padded style={styles.notice}>
            <RatingForm
              requestId={detail.requestId}
              technicianId={detail.technicianId}
              technicianNameAr={detail.technicianNameAr}
              source={ratingSource}
            />
          </Card>
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tracking.backToRequests')}
        onPress={onBackToRequests}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('tracking.backToRequests')}</Text>
      </Pressable>

      <ChatDialog
        visible={chatOpen}
        onClose={onCloseChat}
        conversationId={`req-chat-${detail.requestId}`}
        technicianNameAr={detail.technicianNameAr}
        source={chatSource}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ref: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  summary: {
    marginTop: spacing[4],
    gap: spacing[1],
  },
  task: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tech: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  techText: {
    flex: 1,
  },
  techLabel: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  techName: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  unassigned: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  next: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  notice: {
    marginTop: spacing[4],
  },
  cancelledText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  completedTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  completedBody: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[2],
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  chat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    marginTop: spacing[4],
  },
  pressed: {
    opacity: 0.85,
  },
  chatText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
