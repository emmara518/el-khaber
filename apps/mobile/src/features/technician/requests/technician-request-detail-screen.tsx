/**
 * Technician Request Details screen (T-C) — Customer visual language.
 *
 * AppHeader → PageTitle → request context card → logistics card →
 * lifecycle timeline → documented actions. Accept (accent) and Reject
 * (destructive → confirmation dialog) render ONLY when the policy
 * allows them. No cinematic header.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { canAccept, canReject } from './request-policy';
import { buildTechnicianTimeline, findTechnicianRequest, TECHNICIAN_STATUS_LABELS } from './technician-request-types';
import { useTechnicianRequestsViewModel } from './use-technician-requests-view-model';

import type { TechnicianRequestsDataSource } from './mock-technician-requests-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { joinNonEmpty } from '@/lib/api-format';
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

const ACTIVE_STATES = ['accepted', 'on_the_way', 'in_progress'] as const;

export default function TechnicianRequestDetailScreen({
  requestId,
  source,
}: {
  requestId: string;
  source?: TechnicianRequestsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useTechnicianRequestsViewModel(source);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const header = (
    <AppHeader
      onPressBack={() => router.replace('/(technician)/orders')}
      onPressNotifications={() => router.push('/(technician)/notifications')}
      onPressAvatar={() => router.push('/(technician)/profile')}
    />
  );

  if (vm.listStatus === 'loading') {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="الطلبات" title={t('tech.request.title')} />
          <ListLoading label={t('state.loading')} brandAsset="toolbox" />
        </ScrollView>
      </View>
    );
  }

  if (vm.listStatus === 'error') {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="الطلبات" title={t('tech.request.title')} />
          <ListError
            title={t('tech.request.loadError')}
            message={vm.listError?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={vm.reload}
          />
        </ScrollView>
      </View>
    );
  }

  const request = findTechnicianRequest(vm.requests, requestId);
  if (!request) {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="الطلبات" title={t('tech.request.title')} />
          <ListEmpty
            icon="clipboard"
            iconLabel="طلب غير موجود"
            brandAsset="no-results"
            title={t('tech.request.missing')}
            body={t('tech.request.missingBody')}
            actionLabel={t('tech.request.backToList')}
            onAction={() => router.replace('/(technician)/orders')}
          />
        </ScrollView>
      </View>
    );
  }

  const showAccept = canAccept(request.status) && vm.actionStatus !== 'success';
  const showReject = canReject(request.status) && vm.actionStatus !== 'success';
  const submitting = vm.actionStatus === 'submitting';
  const isActive = ACTIVE_STATES.includes(request.status as (typeof ACTIVE_STATES)[number]);
  const steps = buildTechnicianTimeline(request.status).map((s) => ({
    key: s.status,
    label: TECHNICIAN_STATUS_LABELS[s.status],
    state: s.state,
  }));

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle
          eyebrow="تفاصيل الطلب"
          title={joinNonEmpty([request.applianceAr, request.problemAr])}
          body={request.descriptionAr}
        />

        <Card background={color.surface.base} padded style={styles.card}>
          <View style={styles.headRow}>
            <ApplianceThumb slug={request.applianceSlug} size={72} />
            <View style={styles.headCopy}>
              <StatusBadge status={request.status} label={request.statusLabelAr} icon={statusBrandAsset(request.status)} />
              <Text style={styles.headTitle}>{request.customerNameAr}</Text>
              <Text style={styles.meta}>{request.applianceAr}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <SectionHeading title={t('tech.request.logistics')} />
          <Card background={color.surface.base} padded style={styles.card}>
            <View style={styles.valueRow}>
              <Icon name="map-pin" size={16} color={color.text.secondary} accessibilityLabel="الموقع" />
              <Text style={styles.value}>{request.locationAr || '—'}</Text>
            </View>
            <View style={styles.valueRow}>
              <Icon name="calendar" size={16} color={color.text.secondary} accessibilityLabel="الموعد" />
              <Text style={styles.value}>{request.appointmentAr ?? '—'}</Text>
            </View>
            <View style={styles.valueRow}>
              <Icon name="clock" size={16} color={color.text.secondary} accessibilityLabel="الوقت" />
              <Text style={styles.value}>{request.timeAr || '—'}</Text>
            </View>
            <Text style={styles.meta}>
              {t('tech.request.created')}: {request.createdAr}
            </Text>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeading title="مسار الخدمة" eyebrow="الحالة المسجلة للطلب" />
          <Card background={color.surface.base} padded style={styles.card}>
            <LifecycleTimeline steps={steps} />
          </Card>
        </View>

        {vm.actionStatus === 'success' && vm.actionResult !== null ? (
          <Card background={color.success.soft} borderColor={color.success.DEFAULT} padded style={styles.card}>
            <Text accessibilityRole="alert" style={styles.successTitle}>
              {vm.actionResult.status === 'accepted' ? t('tech.request.accepted') : t('tech.request.rejected')}
            </Text>
            <Text style={styles.body}>
              {vm.actionResult.status === 'accepted' ? t('tech.request.acceptedBody') : t('tech.request.rejectedBody')}
            </Text>
            {vm.actionResult.status === 'accepted' ? (
              <ActionButton
                variant="primary"
                icon="arrow-left"
                label={t('tech.active.goAfterAccept')}
                onPress={() => router.push({ pathname: '/(technician)/active-service', params: { id: request.id } })}
                style={styles.entryGap}
              />
            ) : null}
          </Card>
        ) : null}

        {vm.actionStatus === 'error' ? (
          <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${vm.actionError ?? ''}`} style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{vm.actionError}</Text>
          </View>
        ) : null}

        {!showAccept && isActive ? (
          <ActionButton
            variant="primary"
            icon="arrow-left"
            label={t('tech.active.openFromDetail')}
            onPress={() => router.push({ pathname: '/(technician)/active-service', params: { id: request.id } })}
          />
        ) : null}

        {showAccept ? (
          <ActionButton
            variant="accent"
            icon="check"
            label={t('tech.request.accept')}
            loading={submitting}
            loadingLabel="جارٍ قبول الطلب"
            onPress={() => vm.accept(request.id)}
          />
        ) : null}

        {showReject ? (
          <ActionButton
            variant="destructive"
            label={t('tech.request.reject')}
            disabled={submitting}
            onPress={() => setConfirmingReject(true)}
          />
        ) : null}

        {vm.actionStatus === 'error' ? (
          <ActionButton variant="secondary" label={t('tech.request.retryAction')} onPress={() => vm.resetAction()} />
        ) : null}

        <ActionButton
          variant="secondary"
          label={t('tech.request.backToList')}
          onPress={() => router.replace('/(technician)/orders')}
        />
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={confirmingReject}
        transparent
        animationType="fade"
        accessibilityLabel="تأكيد رفض الطلب"
        onRequestClose={() => setConfirmingReject(false)}
      >
        <View style={styles.scrim}>
          <Card background={color.surface.base} padded style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {t('tech.request.confirmReject')}
            </Text>
            <Text style={styles.body}>{t('tech.request.confirmRejectBody')}</Text>
            <View style={styles.dialogActions}>
              <ActionButton
                variant="destructiveSolid"
                label={t('tech.request.confirmRejectYes')}
                loading={submitting}
                loadingLabel="جارٍ رفض الطلب"
                onPress={() => {
                  setConfirmingReject(false);
                  vm.reject(request.id);
                }}
                style={styles.dialogAction}
              />
              <ActionButton
                variant="secondary"
                label={t('tech.request.confirmRejectNo')}
                onPress={() => setConfirmingReject(false)}
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
  entryGap: { marginTop: spacing[2] },
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
