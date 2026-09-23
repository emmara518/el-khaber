/**
 * Customer Requests screen — order tracking list (Batch A).
 *
 * Header + status filter chips + request cards. Full lifecycle
 * states (docs/07_API.md §22) through the shared `StatusBadge`.
 * Empty (per filter), error+retry, and loading states included.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
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
import { Avatar, Card, fontFamily, Icon, IconText, StatusBadge, statusBrandAsset, type } from '@/ui';
import { SceneHero } from '@/ui/cinematic';

export default function CustomerRequestsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useCustomerRequestsViewModel();
  const [filter, setFilter] = useState<RequestsFilter>('all');

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="customer_home_hero"
        eyebrow="طلباتي"
        title={t('requests.title')}
        body={t('requests.subtitle')}
      />

      <View style={styles.editorial}>
        {status === 'loading' ? <ListLoading label={t('state.loading')} asset="technician_availability" /> : null}
        {status === 'error' ? (
          <ListError
            asset="fault_empty"
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
      </View>
    </ScrollView>
  );

  function renderList(
    requests: ReadonlyArray<CustomerRequestItem>,
    translate: (key: 'requests.empty.title' | 'requests.empty.body') => string,
  ) {
    if (requests.length === 0) {
      return (
        <ListEmpty
          brandAsset="no-requests"
          icon="clipboard"
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
          <StatusBadge status={item.status} label={item.statusLabelAr} icon={statusBrandAsset(item.status)} />
        </View>
      </View>
      <View style={styles.footer}>
        <IconText
          glyph={<Icon name="calendar" size={13} color={color.brand.gold} accessibilityLabel="الموعد" />}
          label={item.scheduledLabelAr}
          size="sm"
        />
      </View>
    </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing[8],
  },
  editorial: {
    paddingHorizontal: spacing[5],
  },
  title: {
    ...type.h2,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    ...type.body,
    color: color.text.secondary,
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
    ...type.bodyMedium,
    color: color.text.secondary,
  },
  chipTextSelected: {
    color: color.text.primary,
    fontFamily: fontFamily.bold,
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
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  model: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  tech: {
    ...type.caption,
    color: color.text.secondary,
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
