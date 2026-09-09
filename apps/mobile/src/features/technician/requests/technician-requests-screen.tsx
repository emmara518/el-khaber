/**
 * Technician Requests list screen (T-C).
 *
 * Lifecycle filter chips (documented states only) + request cards
 * (customer, appliance, problem, time, status — no earnings, no
 * prices, no scores). Cards navigate to the detail route; list
 * actions are intentionally absent (accept/reject live on details).
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../../customer/components/list-state-view';

import {
  TECHNICIAN_REQUEST_FILTERS,
  filterTechnicianRequests,
  type TechnicianRequest,
  type TechnicianRequestFilter,
} from './technician-request-types';
import { useTechnicianRequestsViewModel } from './use-technician-requests-view-model';

import type { TechnicianRequestsDataSource } from './mock-technician-requests-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { Card, StatusBadge } from '@/ui';


export default function TechnicianRequestsScreen({
  source,
}: {
  source?: TechnicianRequestsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useTechnicianRequestsViewModel(source);
  const [filter, setFilter] = useState<TechnicianRequestFilter>('all');

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('tech.requests.title')}
      </Text>
      <Text style={styles.subtitle}>{t('tech.requests.subtitle')}</Text>

      {vm.listStatus === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
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
  );

  function renderList(
    requests: ReadonlyArray<TechnicianRequest>,
    translate: (key: 'tech.requests.empty' | 'tech.requests.emptyBody') => string,
  ) {
    if (requests.length === 0) {
      return (
        <ListEmpty
          icon="📋"
          iconLabel="لا توجد طلبات"
          title={translate('tech.requests.empty')}
          body={translate('tech.requests.emptyBody')}
        />
      );
    }
    return (
      <View style={styles.list}>
        {requests.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`فتح الطلب: ${item.problemAr} لـ ${item.customerNameAr}، الحالة: ${item.statusLabelAr}`}
            onPress={() => router.push({ pathname: '/(technician)/orders/[id]', params: { id: item.id } })}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card background={color.surface.base} padded style={styles.card}>
              <View style={styles.top}>
                <View style={styles.topText}>
                  <Text style={styles.customer}>{item.customerNameAr}</Text>
                  <Text style={styles.problem}>
                    {item.applianceAr} · {item.problemAr}
                  </Text>
                </View>
                <StatusBadge status={item.status} label={item.statusLabelAr} />
              </View>
              <View style={styles.meta}>
                <Text style={styles.metaText}>📍 {item.locationAr}</Text>
                <Text style={styles.metaText}>🕐 {item.timeAr}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  filters: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  chip: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
    backgroundColor: color.brand.goldSoft,
  },
  pressed: {
    opacity: 0.75,
  },
  chipText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  chipTextSelected: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
  list: {
    gap: spacing[3],
  },
  card: {
    gap: spacing[2],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  topText: {
    flex: 1,
  },
  customer: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  problem: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: color.border.default,
    paddingTop: spacing[2],
  },
  metaText: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
