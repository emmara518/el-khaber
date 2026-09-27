/**
 * Technician Requests list screen (T-C) — Customer visual language.
 *
 * AppHeader → PageTitle → filter pills → request cards. Each card uses
 * the shared Card + approved appliance asset + lifecycle status asset,
 * with the documented accept/reject actions. No cinematic header.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  TECHNICIAN_REQUEST_FILTERS,
  filterTechnicianRequests,
  type TechnicianRequest,
  type TechnicianRequestFilter,
} from './technician-request-types';
import { useTechnicianRequestsViewModel } from './use-technician-requests-view-model';

import type { TechnicianRequestsDataSource } from './mock-technician-requests-data-source';
import type { IconName } from '@/ui';

import { useI18n } from '@/i18n/use-i18n';
import {
  ActionButton,
  AppHeader,
  ApplianceThumb,
  Card,
  Icon,
  ListEmpty,
  ListError,
  ListLoading,
  PageTitle,
  StatusBadge,
  statusBrandAsset,
} from '@/ui';
import { fontFamily, type } from '@/ui/typography';

const FILTER_ICON: Record<TechnicianRequestFilter, IconName> = {
  all: 'list',
  pending: 'clock',
  accepted: 'check',
  on_the_way: 'navigation',
  in_progress: 'tool',
  completed: 'check-circle',
  cancelled: 'x-circle',
};

export default function TechnicianRequestsScreen({
  source,
}: {
  source?: TechnicianRequestsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useTechnicianRequestsViewModel(source);
  const [filter, setFilter] = useState<TechnicianRequestFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TechnicianRequest | null>(null);

  useEffect(() => {
    if (vm.actionStatus !== 'submitting') setBusyId(null);
  }, [vm.actionStatus]);

  const submitReject = () => {
    if (rejectTarget !== null) setBusyId(rejectTarget.id);
    setRejectTarget(null);
  };

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(technician)/notifications')}
        onPressAvatar={() => router.push('/(technician)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle eyebrow="الطلبات" title="طلبات جديدة" body="الاطلاع على الطلبات وتقبّل المناسب لك" />

        {vm.listStatus === 'loading' ? <ListLoading label={t('state.loading')} brandAsset="toolbox" /> : null}
        {vm.listStatus === 'error' ? (
          <ListError
            title={t('tech.requests.error')}
            message={vm.listError?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={vm.reload}
          />
        ) : null}

        {vm.listStatus === 'loaded' ? (
          <>
            {vm.actionStatus === 'error' && vm.actionError !== null ? (
              <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${vm.actionError}`} style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{vm.actionError}</Text>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {TECHNICIAN_REQUEST_FILTERS.map((option) => {
                const selected = filter === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="tab"
                    accessibilityLabel={`تصفية الطلبات: ${option.labelAr}${selected ? '، محدد حاليًا' : ''}`}
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(option.id)}
                    style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
                  >
                    <Icon
                      name={FILTER_ICON[option.id]}
                      size={16}
                      color={selected ? color.surface.base : color.text.secondary}
                    />
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.labelAr}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {renderList(filterTechnicianRequests(vm.requests, filter), t)}
          </>
        ) : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={rejectTarget !== null}
        transparent
        animationType="fade"
        accessibilityLabel="تأكيد رفض الطلب"
        onRequestClose={() => setRejectTarget(null)}
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
                onPress={submitReject}
                style={styles.dialogAction}
              />
              <ActionButton
                variant="secondary"
                label={t('tech.request.confirmRejectNo')}
                onPress={() => setRejectTarget(null)}
                style={styles.dialogAction}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );

  function renderList(
    requests: ReadonlyArray<TechnicianRequest>,
    translate: (key: 'tech.requests.empty' | 'tech.requests.emptyBody') => string,
  ) {
    if (requests.length === 0) {
      return (
        <ListEmpty
          brandAsset="no-requests"
          icon="clipboard"
          iconLabel="لا توجد طلبات"
          title={translate('tech.requests.empty')}
          body={translate('tech.requests.emptyBody')}
        />
      );
    }
    return (
      <View style={styles.list}>
        {requests.map((item) => {
          const busy = busyId === item.id && vm.actionStatus === 'submitting';
          const canAct = item.status === 'pending';
          return (
            <Card key={item.id} background={color.surface.base} padded style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`فتح الطلب: ${item.problemAr} لـ ${item.customerNameAr}، الحالة: ${item.statusLabelAr}`}
                onPress={() => router.push({ pathname: '/(technician)/orders/[id]', params: { id: item.id } })}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <View style={styles.cardRow}>
                  <ApplianceThumb slug={item.applianceSlug} size={72} />
                  <View style={styles.cardCopy}>
                    <StatusBadge status={item.status} label={item.statusLabelAr} icon={statusBrandAsset(item.status)} />
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.applianceAr} · {item.problemAr}
                    </Text>
                    <View style={styles.metaRow}>
                      <Icon name="map-pin" size={13} color={color.text.secondary} accessibilityLabel="الموقع" />
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.locationAr || '—'}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Icon name="clock" size={13} color={color.text.secondary} accessibilityLabel="الوقت" />
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.timeAr || '—'}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-left" size={20} color={color.brand.navy} />
                </View>
              </Pressable>

              {canAct ? (
                <View style={styles.actions}>
                  <ActionButton
                    variant="accent"
                    icon="arrow-left"
                    label={t('tech.request.accept')}
                    loading={busy && vm.actionStatus === 'submitting'}
                    loadingLabel="جارٍ قبول الطلب"
                    disabled={vm.actionStatus === 'submitting'}
                    onPress={() => {
                      setBusyId(item.id);
                      vm.accept(item.id);
                    }}
                    style={styles.acceptAction}
                  />
                  <ActionButton
                    variant="destructive"
                    label={t('tech.request.reject')}
                    disabled={vm.actionStatus === 'submitting'}
                    onPress={() => setRejectTarget(item)}
                    style={styles.rejectAction}
                  />
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  filters: { flexDirection: 'row', direction: 'rtl', gap: spacing[2] },
  chip: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1] + 2,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: { borderColor: color.brand.navy, backgroundColor: color.brand.navy },
  chipText: { ...type.bodyMedium, color: color.text.secondary },
  chipTextSelected: { ...type.bodyMedium, fontFamily: fontFamily.bold, color: color.surface.base },
  list: { gap: spacing[3] },
  card: { gap: spacing[3] },
  cardRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  cardCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  cardTitle: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  metaRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[1] },
  meta: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
  actions: { flexDirection: 'row', direction: 'rtl', gap: spacing[2] },
  acceptAction: { flex: 2 },
  rejectAction: { flex: 1 },
  inlineError: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  inlineErrorText: { ...type.body, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  scrim: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  dialog: { width: '100%', maxWidth: 420, gap: spacing[2] },
  dialogTitle: { ...type.h3, color: color.text.primary, textAlign: 'right' },
  dialogActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
  dialogAction: { flex: 1 },
  bottomSpacer: { height: spacing[2] },
  pressed: { opacity: 0.85 },
});
