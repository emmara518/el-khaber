/**
 * Customer Requests screen — order tracking list (Batch A).
 *
 * Header + status filter chips + request cards. Full lifecycle
 * states (docs/07_API.md §22) through the shared `StatusBadge`.
 * Empty (per filter), error+retry, and loading states included.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';

import {
  REQUEST_FILTERS,
  filterRequestsByStatus,
  type CustomerRequestItem,
  type RequestsFilter,
} from './customer-requests-types';
import { useCustomerRequestsViewModel } from './use-customer-requests-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card, IconText, StatusBadge } from '@/ui';

export default function CustomerRequestsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useCustomerRequestsViewModel();
  const [filter, setFilter] = useState<RequestsFilter>('all');

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('requests.title')}
      </Text>
      <Text style={styles.subtitle}>{t('requests.subtitle')}</Text>

      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          title={t('requests.error.title')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' && data ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {REQUEST_FILTERS.map((f) => {
              const selected = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="tab"
                  accessibilityLabel={`تصفية الطلبات: ${f.labelAr}${selected ? '، محدد حاليًا' : ''}`}
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(f.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {f.labelAr}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {renderList(filterRequestsByStatus(data.requests, filter), t)}
        </>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  function renderList(
    requests: ReadonlyArray<CustomerRequestItem>,
    translate: (key: 'requests.empty.title' | 'requests.empty.body') => string,
  ) {
    if (requests.length === 0) {
      return (
        <ListEmpty
          icon="📋"
          iconLabel="لا توجد طلبات"
          title={translate('requests.empty.title')}
          body={translate('requests.empty.body')}
        />
      );
    }
    return (
      <View style={styles.list}>
        {requests.map((item) => (
          <RequestCard
            key={item.id}
            item={item}
            onPress={() => router.push({ pathname: '/(customer)/requests/[id]', params: { id: item.id } })}
          />
        ))}
      </View>
    );
  }
}

function RequestCard({ item, onPress }: { item: CustomerRequestItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`تتبع طلب: ${item.taskAr}، الحالة: ${item.statusLabelAr}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
    <Card background={color.surface.base} padded style={styles.card}>
      <View style={styles.row}>
        <Avatar
          initials={item.technicianInitialsAr}
          size={52}
          accessibilityLabel={item.technicianNameAr}
        />
        <View style={styles.middle}>
          <Text style={styles.task}>{item.taskAr}</Text>
          <Text style={styles.model}>
            {item.applianceAr} · {item.brandAndModel}
          </Text>
          <Text style={styles.tech}>{item.technicianNameAr}</Text>
        </View>
        <View style={styles.side}>
          <StatusBadge status={item.status} label={item.statusLabelAr} />
        </View>
      </View>
      <View style={styles.footer}>
        <IconText glyph="📅" label={item.scheduledLabelAr} size="sm" />
      </View>
    </Card>
    </Pressable>
  );
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
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  middle: {
    flex: 1,
  },
  task: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  model: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  tech: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  side: {
    alignItems: 'flex-end',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: color.border.default,
    paddingTop: spacing[2],
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
