/**
 * Technician Active Service screen (T-D) — Customer visual language.
 *
 * AppHeader → PageTitle ("ماذا أفعل الآن؟") → current service card →
 * lifecycle timeline → exactly ONE documented next action per state,
 * plus chat when the request is active. No cinematic header/scene.
 * Chat renders in the technician role (correct side + counterparty).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiChatDataSource } from '../../customer/chat/api-chat-data-source';
import { ChatDialog } from '../../customer/chat/chat-dialog';

import { buildTechnicianTimeline, TECHNICIAN_STATUS_LABELS } from './technician-request-types';
import { useTechnicianActiveServiceViewModel } from './use-technician-active-service-view-model';

import type { TechnicianRequestsDataSource } from './mock-technician-requests-data-source';

import { useI18n } from '@/i18n/use-i18n';
import {
  ActionButton,
  AppHeader,
  ApplianceThumb,
  Card,
  Icon,
  LifecycleTimeline,
  ListEmpty,
  ListError,
  ListLoading,
  PageTitle,
  SectionHeading,
  StatusBadge,
  statusBrandAsset,
} from '@/ui';
import { fontFamily, type } from '@/ui/typography';

const STATUS_HINTS: Record<string, string> = {
  accepted: 'تم قبول الطلب. عند توجّهك إلى العميل، أكّد الانطلاق.',
  on_the_way: 'أنت في الطريق إلى العميل. عند بدء العمل على الجهاز، حدّث الحالة.',
  in_progress: 'العمل جارٍ على الطلب. عند إتمامه بالكامل، أكّد إنهاء الخدمة.',
  completed: 'اكتملت الخدمة على هذا الطلب.',
  cancelled: 'تم إلغاء هذا الطلب.',
};

export default function TechnicianActiveServiceScreen({
  requestId,
  source,
}: {
  requestId: string;
  source?: TechnicianRequestsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useTechnicianActiveServiceViewModel(requestId, source);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const header = (
    <AppHeader
      onPressNotifications={() => router.push('/(technician)/notifications')}
      onPressAvatar={() => router.push('/(technician)/profile')}
    />
  );

  if (vm.loadStatus === 'loading') {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="الخدمة النشطة" title={t('tech.active.title')} />
          <ListLoading label={t('state.loading')} brandAsset="toolbox" />
        </ScrollView>
      </View>
    );
  }

  if (vm.loadStatus === 'error') {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="الخدمة النشطة" title={t('tech.active.title')} />
          <ListError
            title={t('tech.active.loadError')}
            message={vm.loadError?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={vm.reload}
          />
        </ScrollView>
      </View>
    );
  }

  const request = vm.request;
  if (!request) {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="الخدمة النشطة" title={t('tech.active.title')} />
          <ListEmpty
            icon="tool"
            iconLabel="طلب غير موجود"
            brandAsset="no-results"
            title={t('tech.request.missing')}
            body={t('tech.request.missingBody')}
            actionLabel={t('tech.active.backToList')}
            onAction={() => router.replace('/(technician)/orders')}
          />
        </ScrollView>
      </View>
    );
  }

  const hint = STATUS_HINTS[request.status] ?? '';
  const showCompleteConfirm = request.status === 'in_progress' && confirmingComplete;
  const submitting = vm.actionStatus === 'submitting';
  const canChat = request.status === 'on_the_way' || request.status === 'in_progress';
  const steps = buildTechnicianTimeline(request.status).map((s) => ({
    key: s.status,
    label: TECHNICIAN_STATUS_LABELS[s.status],
    state: s.state,
  }));

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle eyebrow="ماذا أفعل الآن؟" title={request.statusLabelAr} body={hint} />

        <Card background={color.surface.base} padded style={styles.card}>
          <View style={styles.headRow}>
            <ApplianceThumb slug={request.applianceSlug} size={72} />
            <View style={styles.headCopy}>
              <StatusBadge status={request.status} label={request.statusLabelAr} icon={statusBrandAsset(request.status)} />
              <Text style={styles.headTitle} numberOfLines={2}>
                {request.applianceAr} · {request.problemAr}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {request.customerNameAr}
              </Text>
            </View>
          </View>
          <View style={styles.valueRow}>
            <Icon name="map-pin" size={16} color={color.text.secondary} accessibilityLabel="الموقع" />
            <Text style={styles.value} numberOfLines={1}>
              {request.locationAr || '—'}
            </Text>
          </View>
          {request.appointmentAr !== null ? (
            <View style={styles.valueRow}>
              <Icon name="calendar" size={16} color={color.text.secondary} accessibilityLabel="الموعد" />
              <Text style={styles.value}>{request.appointmentAr}</Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.section}>
          <SectionHeading title="مسار الخدمة" eyebrow="الحالة المسجلة للطلب" />
          <Card background={color.surface.base} padded style={styles.card}>
            <LifecycleTimeline steps={steps} />
          </Card>
        </View>

        {vm.actionStatus === 'success' && vm.actionResult !== null ? (
          <Card background={color.success.soft} borderColor={color.success.DEFAULT} padded style={styles.card}>
            <Text accessibilityRole="alert" style={styles.successTitle}>
              {vm.actionResult.status === 'completed' ? t('tech.active.completedTitle') : t('tech.active.advanced')}
            </Text>
            <Text style={styles.body}>
              {vm.actionResult.status === 'completed'
                ? t('tech.active.completedBody')
                : `${t('tech.active.nowState')} ${request.statusLabelAr}`}
            </Text>
          </Card>
        ) : null}

        {vm.actionStatus === 'error' ? (
          <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${vm.actionError ?? ''}`} style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{vm.actionError}</Text>
          </View>
        ) : null}

        {vm.nextActionAr !== null ? (
          <ActionButton
            variant="accent"
            icon="arrow-left"
            label={vm.nextActionAr}
            loading={submitting}
            loadingLabel="جارٍ تحديث حالة الطلب"
            onPress={() => {
              if (request.status === 'in_progress') setConfirmingComplete(true);
              else vm.advance();
            }}
          />
        ) : null}

        {vm.actionStatus === 'error' ? (
          <ActionButton variant="secondary" label={t('state.retry')} onPress={vm.resetAction} />
        ) : null}

        {canChat ? (
          <ActionButton variant="primary" icon="message-circle" label={t('tech.active.chat')} onPress={() => setChatOpen(true)} />
        ) : null}

        <ActionButton
          variant="secondary"
          label={t('tech.active.backToList')}
          onPress={() => router.replace('/(technician)/orders')}
        />
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <ChatDialog
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        conversationId={`req-chat-${request.id}`}
        technicianNameAr={request.customerNameAr}
        peerNameAr={request.customerNameAr}
        serviceTitle={request.applianceAr}
        requestId={request.id}
        role="technician"
        source={new ApiChatDataSource()}
      />

      <Modal
        visible={showCompleteConfirm}
        transparent
        animationType="fade"
        accessibilityLabel="تأكيد إنهاء الخدمة"
        onRequestClose={() => setConfirmingComplete(false)}
      >
        <View style={styles.scrim}>
          <Card background={color.surface.base} padded style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {t('tech.active.confirmComplete')}
            </Text>
            <Text style={styles.body}>{t('tech.active.confirmCompleteBody')}</Text>
            <View style={styles.dialogActions}>
              <ActionButton
                variant="primary"
                label={t('tech.active.confirmYes')}
                loading={submitting}
                loadingLabel="جارٍ إنهاء الخدمة"
                onPress={() => {
                  setConfirmingComplete(false);
                  vm.advance();
                }}
                style={styles.dialogAction}
              />
              <ActionButton
                variant="secondary"
                label={t('tech.active.confirmNo')}
                onPress={() => setConfirmingComplete(false)}
                style={styles.dialogAction}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  section: { gap: spacing[3] },
  card: { gap: spacing[3] },
  headRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  headCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  headTitle: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  valueRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[2] },
  value: { ...type.bodyMedium, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
  meta: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  successTitle: { ...type.h3, color: color.text.primary, textAlign: 'right', fontFamily: fontFamily.bold },
  inlineError: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  inlineErrorText: { ...type.body, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  scrim: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  dialog: { width: '100%', maxWidth: 420, gap: spacing[2] },
  dialogTitle: { ...type.h3, color: color.text.primary, textAlign: 'right', fontFamily: fontFamily.bold },
  dialogActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  dialogAction: { flex: 1 },
  bottomSpacer: { height: spacing[2] },
});
