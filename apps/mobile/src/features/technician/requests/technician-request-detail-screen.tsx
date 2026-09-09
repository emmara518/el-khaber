/**
 * Technician Request Details screen (T-C).
 *
 * Reference + customer + appliance/problem/description + location +
 * appointment + status. Accept (primary) and Reject (separated
 * destructive → confirmation dialog) render ONLY when the documented
 * policy allows them; otherwise the state speaks for itself.
 * Outcomes: idle → submitting → success | stale/error, all with
 * back-to-list exits and context-preserving retry.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../../customer/components/list-state-view';

import { canAccept, canReject } from './request-policy';
import { findTechnicianRequest } from './technician-request-types';
import { useTechnicianRequestsViewModel } from './use-technician-requests-view-model';

import type { TechnicianRequestsDataSource } from './mock-technician-requests-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { Card, StatusBadge } from '@/ui';


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

  if (vm.listStatus === 'loading') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('tech.request.title')}
        </Text>
        <ListLoading label={t('state.loading')} />
      </ScrollView>
    );
  }

  if (vm.listStatus === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('tech.request.title')}
        </Text>
        <ListError
          title={t('tech.request.loadError')}
          message={vm.listError?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={vm.reload}
        />
      </ScrollView>
    );
  }

  const request = findTechnicianRequest(vm.requests, requestId);
  if (!request) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <ListEmpty
          icon="📋"
          iconLabel="طلب غير موجود"
          title={t('tech.request.missing')}
          body={t('tech.request.missingBody')}
          actionLabel={t('tech.request.backToList')}
          onAction={() => router.replace('/(technician)/orders')}
        />
      </ScrollView>
    );
  }

  const showAccept = canAccept(request.status) && vm.actionStatus !== 'success';
  const showReject = canReject(request.status) && vm.actionStatus !== 'success';
  const submitting = vm.actionStatus === 'submitting';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heading}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {t('tech.request.title')}
          </Text>
          <Text style={styles.ref}>
            {t('tech.request.ref')}: {request.id}
          </Text>
        </View>
        <StatusBadge status={request.status} label={request.statusLabelAr} />
      </View>

      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.sectionLabel}>{t('tech.request.customer')}</Text>
        <Text style={styles.value}>{request.customerNameAr}</Text>
      </Card>

      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.sectionLabel}>{t('tech.request.problem')}</Text>
        <Text style={styles.value}>
          {request.applianceAr} · {request.problemAr}
        </Text>
        <Text style={styles.body}>{request.descriptionAr}</Text>
      </Card>

      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.sectionLabel}>{t('tech.request.logistics')}</Text>
        <Text style={styles.value}>📍 {request.locationAr}</Text>
        <Text style={styles.value}>🕐 {request.timeAr}</Text>
        <Text style={styles.meta}>
          {t('tech.request.created')}: {request.createdAr}
        </Text>
        {request.appointmentAr !== null ? (
          <Text style={styles.meta}>
            {t('tech.request.appointment')}: {request.appointmentAr}
          </Text>
        ) : null}
      </Card>

      {vm.actionStatus === 'success' && vm.actionResult !== null ? (
        <Card
          background={color.success.soft}
          borderColor={color.success.DEFAULT}
          padded
          style={styles.card}
        >
          <Text accessibilityRole="alert" style={styles.successTitle}>
            {vm.actionResult.status === 'accepted'
              ? t('tech.request.accepted')
              : t('tech.request.rejected')}
          </Text>
          <Text style={styles.body}>
            {vm.actionResult.status === 'accepted'
              ? t('tech.request.acceptedBody')
              : t('tech.request.rejectedBody')}
          </Text>
        </Card>
      ) : null}

      {vm.actionStatus === 'error' ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${vm.actionError ?? ''}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{vm.actionError}</Text>
        </View>
      ) : null}

      {showAccept ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.request.accept')}
          accessibilityState={{ disabled: submitting, busy: submitting }}
          onPress={() => vm.accept(request.id)}
          disabled={submitting}
          style={({ pressed }) => [styles.accept, submitting && styles.disabled, pressed && !submitting && styles.pressed]}
        >
          {submitting ? (
            <ActivityIndicator accessibilityLabel="جارٍ قبول الطلب" color={color.surface.base} />
          ) : (
            <Text style={styles.acceptText}>✓ {t('tech.request.accept')}</Text>
          )}
        </Pressable>
      ) : null}

      {showReject ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.request.reject')}
          onPress={() => setConfirmingReject(true)}
          disabled={submitting}
          style={({ pressed }) => [styles.reject, pressed && styles.pressed]}
        >
          <Text style={styles.rejectText}>{t('tech.request.reject')}</Text>
        </Pressable>
      ) : null}

      {vm.actionStatus === 'error' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.request.retryAction')}
          onPress={() => {
            vm.resetAction();
          }}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t('tech.request.retryAction')}</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tech.request.backToList')}
        onPress={() => router.replace('/(technician)/orders')}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('tech.request.backToList')}</Text>
      </Pressable>

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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tech.request.confirmRejectYes')}
                accessibilityState={{ disabled: submitting, busy: submitting }}
                onPress={() => {
                  setConfirmingReject(false);
                  vm.reject(request.id);
                }}
                disabled={submitting}
                style={({ pressed }) => [styles.rejectSolid, pressed && styles.pressed]}
              >
                <Text style={styles.acceptText}>{t('tech.request.confirmRejectYes')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tech.request.confirmRejectNo')}
                onPress={() => setConfirmingReject(false)}
                style={({ pressed }) => [styles.secondaryInline, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>{t('tech.request.confirmRejectNo')}</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  card: {
    marginTop: spacing[3],
    gap: spacing[1],
  },
  sectionLabel: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  value: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  meta: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  successTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  inlineError: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  inlineErrorText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  accept: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  acceptText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  reject: {
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
  },
  rejectText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  rejectSolid: {
    flex: 1,
    backgroundColor: color.error.DEFAULT,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
  secondaryInline: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  scrim: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    gap: spacing[2],
  },
  dialogTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
