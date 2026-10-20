/**
 * NotificationListScreen — one shared notification center for every role.
 *
 * The backend contract is role-agnostic (`GET /notifications`,
 * `GET /notifications/unread-count`, `GET|PUT /notifications/preferences`,
 * `POST /notifications/:id/read`, `POST /notifications/read-all`); only the
 * navigation targets and copy differ per role. This component renders the
 * canonical AppHeader → PageTitle → preferences → mark-all → cards
 * composition so the three role screens cannot drift apart.
 *
 * WP-Notifications: paginated (load-more, deduped), server-authoritative
 * unread count, deep-link navigation from the server `dataJson` payload,
 * and the server-backed preferences card.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { resolveNotificationTarget } from './notification-navigation';
import { NotificationPreferencesCard } from './notification-preferences-card';
import { useNotificationsViewModel } from './use-notifications-view-model';

import type { NotificationItem, NotificationsDataSource } from './notifications-data-source';

import { AppHeader, Card, Icon, ListEmpty, ListError, ListLoading, PageTitle } from '@/ui';
import { type } from '@/ui/typography';

export interface NotificationListScreenProps {
  role: 'customer' | 'technician' | 'merchant';
  eyebrow: string;
  title: string;
  body: string;
  emptyTitle: string;
  emptyBody: string;
  onPressNotifications: () => void;
  onPressAvatar: () => void;
  /**
   * Testability seam (preview/screenshot harnesses only): overrides the
   * API-backed source. Production callers omit it and hit the server.
   */
  source?: NotificationsDataSource;
}

export function NotificationListScreen({
  role,
  eyebrow,
  title,
  body,
  emptyTitle,
  emptyBody,
  onPressNotifications,
  onPressAvatar,
  source,
}: NotificationListScreenProps) {
  const vm = useNotificationsViewModel(role, source);
  const router = useRouter();

  const openNotification = (item: NotificationItem) => {
    // Read-state updates only after the server confirms (ViewModel);
    // navigation itself is immediate so the tap always opens the
    // destination. A failed mark-read keeps the item unread (truthful)
    // and surfaces `mutationError` on return.
    vm.markRead(item.id);
    const target = resolveNotificationTarget(role, { type: item.type, dataJson: item.dataJson });
    if (target !== null) {
      router.push(target as never);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader onPressNotifications={onPressNotifications} onPressAvatar={onPressAvatar} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.editorial}>
          <PageTitle eyebrow={eyebrow} title={title} body={body} />

          <NotificationPreferencesCard role={role} source={source} />

          {vm.status === 'loading' ? <ListLoading label="جارٍ تحميل الإشعارات" brandAsset="no-requests" /> : null}
          {vm.status === 'error' ? (
            <ListError
              title="تعذر تحميل الإشعارات"
              message={vm.error?.message ?? ''}
              retryLabel="إعادة المحاولة"
              onRetry={vm.retry}
            />
          ) : null}
          {vm.status === 'loaded' && vm.data !== null ? (
            vm.data.length === 0 ? (
              <ListEmpty
                icon="bell"
                iconLabel="لا توجد إشعارات"
                brandAsset="no-requests"
                title={emptyTitle}
                body={emptyBody}
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
                    <Icon name="check-circle" size={16} color={color.brand.navy} accessible={false} />
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
                    <NotificationRow key={item.id} item={item} onPress={() => openNotification(item)} />
                  ))}
                </View>
                {vm.hasMore ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={vm.loadingMore ? 'جارٍ تحميل المزيد' : 'تحميل المزيد من الإشعارات'}
                    onPress={vm.loadMore}
                    disabled={vm.loadingMore}
                    style={({ pressed }) => [
                      styles.loadMore,
                      pressed && styles.pressed,
                      vm.loadingMore && styles.disabled,
                    ]}
                  >
                    <Text style={styles.loadMoreText}>
                      {vm.loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )
          ) : null}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
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
            <Text style={styles.itemTitle}>{item.titleAr}</Text>
            <Text style={styles.itemBody}>{item.bodyAr}</Text>
            <Text style={styles.time}>{item.timeAr}</Text>
          </View>
          {!item.read ? <View style={styles.unreadDot} accessible={false} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
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
  itemTitle: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  itemBody: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  time: { ...type.caption, color: color.text.secondary, marginTop: spacing[1], textAlign: 'right' },
  unreadDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: color.brand.navy, marginTop: spacing[1] },
  loadMore: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
  },
  loadMoreText: { ...type.label, color: color.brand.navy },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  bottomSpacer: { height: spacing[2] },
});
