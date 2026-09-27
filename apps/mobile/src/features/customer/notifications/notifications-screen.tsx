/**
 * Customer Notifications center (PHASE 9).
 *
 * Real API-backed list (GET /notifications, POST /notifications/:id/read,
 * POST /notifications/read-all) through the shared notifications view
 * model. In-app only — no push provider exists (documented).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CustomerHeader } from '../components/customer-header';
import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';

import type { NotificationItem } from '@/features/notifications/notifications-data-source';

import { useNotificationsViewModel } from '@/features/notifications/use-notifications-view-model';
import { useI18n } from '@/i18n/use-i18n';
import { Card, Icon, type } from '@/ui';

export default function NotificationsScreen() {
  const { t } = useI18n();
  const vm = useNotificationsViewModel('customer');

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <CustomerHeader
        eyebrow="التنبيهات"
        title="الإشعارات"
        body="أحدث التحديثات على طلباتك ومحادثاتك واشتراكك."
      />
      <View style={styles.editorial}>
        {vm.status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
        {vm.status === 'error' ? (
          <ListError
            title="تعذر تحميل الإشعارات"
            message={vm.error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={vm.retry}
          />
        ) : null}
        {vm.status === 'loaded' && vm.data !== null ? (
          vm.data.length === 0 ? (
            <ListEmpty
              icon="bell"
              iconLabel="لا توجد إشعارات"
              brandAsset="no-requests"
              title="لا توجد إشعارات"
              body="ستظهر هنا تحديثات طلباتك ورسائل الفنيين."
            />
          ) : (
            <>
              {vm.unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="تعليم كل الإشعارات كمقروءة"
                  onPress={vm.markAllRead}
                  style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
                >
                  <Icon name="check-circle" size={16} color={color.brand.navy} />
                  <Text style={styles.markAllText}>تعليم الكل كمقروء ({vm.unreadCount})</Text>
                </Pressable>
              ) : null}
              {vm.mutationError !== null ? (
                <Text accessibilityRole="alert" style={styles.mutationError}>
                  {vm.mutationError}
                </Text>
              ) : null}
              <View style={styles.list}>
                {vm.data.map((item) => (
                  <NotificationRow key={item.id} item={item} onPress={() => vm.markRead(item.id)} />
                ))}
              </View>
            </>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

function NotificationRow({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const label = `${item.read ? '' : 'غير مقروء، '}${item.titleAr}. ${item.bodyAr}. ${item.timeAr}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card
        background={item.read ? color.surface.base : color.brand.goldSoft}
        borderColor={item.read ? color.border.default : color.brand.gold}
        padded
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={[styles.tile, item.read ? styles.tileRead : styles.tileUnread]}>
            <Icon name="bell" size={18} color={item.read ? color.text.secondary : color.brand.navy} />
          </View>
          <View style={styles.middle}>
            <Text style={styles.title}>{item.titleAr}</Text>
            <Text style={styles.body}>{item.bodyAr}</Text>
            <Text style={styles.time}>{item.timeAr}</Text>
          </View>
          {!item.read ? <View style={styles.unreadDot} accessibilityLabel="غير مقروء" /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing[8] },
  editorial: { paddingHorizontal: spacing[5], paddingTop: spacing[4], gap: spacing[3] },
  markAll: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing[2],
  },
  markAllText: { ...type.label, color: color.brand.navy },
  mutationError: { ...type.caption, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  list: { gap: spacing[3] },
  card: { borderRadius: radius.lg },
  row: { flexDirection: 'row', direction: 'rtl', alignItems: 'flex-start', gap: spacing[3] },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileRead: { backgroundColor: color.surface.subtle },
  tileUnread: { backgroundColor: color.surface.base },
  middle: { flex: 1, gap: 2 },
  title: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  time: { ...type.caption, color: color.text.secondary, marginTop: spacing[1], textAlign: 'right' },
  unreadDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: color.brand.navy, marginTop: spacing[1] },
  pressed: { opacity: 0.85 },
});
