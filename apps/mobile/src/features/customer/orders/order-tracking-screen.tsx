import { color, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatDialog } from '../chat/chat-dialog';
import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';
import { RatingForm } from '../rating/rating-form';

import { nextStepTitle, type OrderDataSource, type OrderDetail } from './order-detail-types';
import { OrderTimeline } from './order-timeline';
import { canChatWithOrder, canRateOrder, TRACKING_SCENES } from './tracking-scenes';
import { useOrderViewModel } from './use-order-view-model';

import type { ChatDataSource } from '../chat/chat-types';
import type { RatingDataSource } from '../rating/rating-types';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, StatusBadge, statusBrandAsset } from '@/ui';
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
  return (
    <>
      <SceneHero key={detail.status} compact asset={scene.asset} eyebrow="متابعة الخدمة · آخر حالة مسجلة" title={detail.statusLabelAr} body={scene.body}
        action={chattable ? <SceneAction label={`تواصل مع ${detail.technicianNameAr}`} onPress={onOpenChat} /> : <SceneAction label="العودة إلى طلباتي" onPress={onBackToRequests} />}>
        <Text selectable style={styles.reference}>رقم الطلب: {detail.requestId}</Text>
      </SceneHero>
      <View style={styles.sections}>
        <SceneSection eyebrow={detail.applianceAr} title={detail.taskAr} body={detail.locationAr}>
          {detail.appointmentAr !== null ? <Text style={styles.detail}>الموعد: {detail.appointmentAr}</Text> : null}
          <StatusBadge status={detail.status} label={detail.statusLabelAr} icon={statusBrandAsset(detail.status)} />
          {detail.technicianId !== null ? (
            <View style={styles.identity}>
              <Avatar initials={detail.technicianInitialsAr} size={52} accessibilityLabel={detail.technicianNameAr} />
              <View style={styles.identityCopy}>
                <Text style={styles.label}>{t('tracking.technician')}</Text>
                <Text style={styles.name}>{detail.technicianNameAr}</Text>
              </View>
            </View>
          ) : <Text style={styles.detail}>{t('tracking.unassigned')}</Text>}
        </SceneSection>
        {rateable && detail.technicianId !== null ? (
          <SceneSection asset="tracking_success" title="كيف كانت تجربتك؟" body="تقييمك مرتبط بهذه الخدمة فقط.">
            <RatingForm requestId={detail.requestId} technicianId={detail.technicianId} technicianNameAr={detail.technicianNameAr} source={ratingSource} />
          </SceneSection>
        ) : null}
        <SceneSection title={t('tracking.timeline')} body={nextStepTitle(detail.status) ?? 'انتهى مسار هذا الطلب.'}>
          <OrderTimeline steps={detail.timeline} />
          <Text style={styles.label}>الحالة من سجل الطلب، وليست تتبعًا مباشرًا. حدّث لعرض آخر التغييرات.</Text>
          <SceneAction variant="secondary" label="تحديث حالة الطلب" onPress={onRefresh} />
        </SceneSection>
        <SceneAction variant="secondary" label={t('tracking.backToRequests')} onPress={onBackToRequests} />
      </View>
      {chattable ? <ChatDialog visible={chatOpen} onClose={onCloseChat} conversationId={`req-chat-${detail.requestId}`} technicianNameAr={detail.technicianNameAr} serviceTitle={detail.taskAr} requestId={detail.requestId} source={chatSource} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[6], paddingBottom: spacing[8], direction: 'rtl' },
  sections: { paddingHorizontal: spacing[5], gap: spacing[3] },
  reference: { color: color.brand.goldSoft, fontSize: typography.size.caption, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl', marginTop: spacing[2] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] },
  identityCopy: { flex: 1, gap: spacing[1] },
  name: { color: color.brand.navy, fontSize: typography.size.h3, lineHeight: 30, fontWeight: typography.weight.bold, textAlign: 'right', writingDirection: 'rtl' },
  label: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
  detail: { color: color.text.primary, fontSize: typography.size.body, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
});
