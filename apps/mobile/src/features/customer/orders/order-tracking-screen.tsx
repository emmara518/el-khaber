import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../chat/chat-dialog';
import { RatingForm } from '../rating/rating-form';

import { nextStepTitle, type OrderDataSource, type OrderDetail } from './order-detail-types';
import { orderReferenceLabel } from './order-reference';
import { OrderTimeline } from './order-timeline';
import { canChatWithOrder, canRateOrder, TRACKING_SCENES } from './tracking-scenes';
import { useOrderViewModel } from './use-order-view-model';

import type { ChatDataSource } from '../chat/chat-types';
import type { RatingDataSource } from '../rating/rating-types';

import { useI18n } from '@/i18n/use-i18n';
import { ListEmpty, ListError, ListLoading } from '@/ui';
import { Avatar, Icon, StatusBadge, statusBrandAsset, type } from '@/ui';
import { SceneAction, SceneHero, SceneSection } from '@/ui/cinematic';

export default function OrderTrackingScreen({ requestId, orderSource, chatSource, ratingSource }: {
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
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={retry} />}>
      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? <ListError title={t('tracking.error.title')} message={error?.message ?? ''} retryLabel={t('state.retry')} onRetry={retry} /> : null}
      {status === 'missing' ? <ListEmpty icon="clipboard" iconLabel="طلب غير موجود" title={t('tracking.missing.title')} body={t('tracking.missing.body')} actionLabel={t('tracking.missing.action')} onAction={() => router.replace('/(customer)/requests')} /> : null}
      {status === 'loaded' && data !== null ? (
        <TrackingBody detail={data} chatOpen={chatOpen} onOpenChat={() => setChatOpen(true)} onCloseChat={() => setChatOpen(false)} chatSource={chatSource} ratingSource={ratingSource} onRefresh={retry} onBackToRequests={() => router.replace('/(customer)/requests')} />
      ) : null}
    </ScrollView>
  );
}

function TrackingBody({ detail, chatOpen, onOpenChat, onCloseChat, chatSource, ratingSource, onRefresh, onBackToRequests }: {
  detail: OrderDetail;
  chatOpen: boolean;
  onOpenChat: () => void;
  onCloseChat: () => void;
  chatSource?: ChatDataSource;
  ratingSource?: RatingDataSource;
  onRefresh: () => void;
  onBackToRequests: () => void;
}) {
  const { t } = useI18n();
  const scene = TRACKING_SCENES[detail.status];
  const chattable = canChatWithOrder(detail.status, detail.technicianId);
  const rateable = canRateOrder(detail.status, detail.technicianId);
  const nextStep = nextStepTitle(detail.status);
  return (
    <>
      {/* 1) Current status — compact hero, no oversized banner on mobile. */}
      <SceneHero
        key={detail.status}
        compact
        asset={scene.asset}
        eyebrow="متابعة الخدمة · آخر حالة مسجلة"
        title={scene.title}
        body={scene.body}
      >
        <View style={styles.heroMeta}>
          <StatusBadge status={detail.status} label={detail.statusLabelAr} icon={statusBrandAsset(detail.status)} />
          <Text selectable style={styles.reference}>{orderReferenceLabel(detail.requestId)}</Text>
        </View>
      </SceneHero>

      {/* 2) Technician — immediately after the status it belongs to. */}
      <View style={styles.sections}>
        <SceneSection eyebrow={detail.applianceAr} title={detail.taskAr}>
          {detail.locationAr.trim().length > 0 ? (
            <View style={styles.metaRow}>
              <Icon name="map-pin" size={15} color={color.text.secondary} accessible={false} />
              <Text style={styles.detail}>{detail.locationAr}</Text>
            </View>
          ) : null}
          {detail.appointmentAr !== null ? <Text style={styles.detail}>الموعد: {detail.appointmentAr}</Text> : null}
          {detail.technicianId !== null ? (
            <View style={styles.identity}>
              <Avatar initials={detail.technicianInitialsAr} size={52} accessibilityLabel={detail.technicianNameAr} />
              <View style={styles.identityCopy}>
                <Text style={styles.label}>{t('tracking.technician')}</Text>
                <Text style={styles.name}>{detail.technicianNameAr}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.identity}>
              <Avatar initials="؟" size={52} accessibilityLabel={t('tracking.unassigned')} />
              <View style={styles.identityCopy}>
                <Text style={styles.label}>{t('tracking.technician')}</Text>
                <Text style={styles.name}>{t('tracking.unassigned')}</Text>
              </View>
            </View>
          )}
        </SceneSection>

        {/* 3) Timeline — the recorded history (distinct function from the hero). */}
        <SceneSection title={t('tracking.timeline')}>
          <OrderTimeline steps={detail.timeline} />
          <Text style={styles.label}>{t('tracking.timelineNote')}</Text>
        </SceneSection>

        {rateable && detail.technicianId !== null ? (
          <SceneSection asset="tracking_success" title={t('tracking.rate.title')} body={t('tracking.rate.body')}>
            <RatingForm requestId={detail.requestId} technicianId={detail.technicianId} technicianNameAr={detail.technicianNameAr} source={ratingSource} />
          </SceneSection>
        ) : null}

        {/* 4) Next action — one primary action, then secondary utilities. */}
        {nextStep !== null ? (
          <SceneSection title={t('tracking.next.title')} body={nextStep}>
            {chattable ? <SceneAction label={`تواصل مع ${detail.technicianNameAr}`} onPress={onOpenChat} /> : null}
            {!chattable ? <SceneAction variant="secondary" icon="arrow-right" label={t('tracking.backToRequests')} onPress={onBackToRequests} /> : null}
          </SceneSection>
        ) : (
          <SceneAction variant="secondary" icon="arrow-right" label={t('tracking.backToRequests')} onPress={onBackToRequests} />
        )}

        <SceneAction variant="secondary" icon="clock" label={t('tracking.refresh')} onPress={onRefresh} />
      </View>
      {chattable ? <ChatDialog visible={chatOpen} onClose={onCloseChat} conversationId={`req-chat-${detail.requestId}`} technicianNameAr={detail.technicianNameAr} serviceTitle={detail.taskAr} source={chatSource} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[6], paddingBottom: spacing[8], direction: 'rtl' },
  sections: { paddingHorizontal: spacing[5], gap: spacing[3] },
  heroMeta: { gap: spacing[2], marginTop: spacing[2], alignItems: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2, marginBottom: spacing[1] },
  reference: { ...type.caption, color: color.brand.goldSoft, textAlign: 'right', writingDirection: 'rtl' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] },
  identityCopy: { flex: 1, gap: spacing[1] },
  name: { ...type.h3, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  label: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  detail: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
});
