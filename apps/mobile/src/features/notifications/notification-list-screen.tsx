/**
 * NotificationListScreen — one shared notification center for every role.
 *
 * The backend contract is role-agnostic (`GET /notifications`,
 * `POST /notifications/:id/read`, `POST /notifications/read-all`); only the
 * navigation targets and copy differ per role. This component renders the
 * canonical AppHeader → PageTitle → mark-all → cards composition so the
 * three role screens cannot drift apart.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useNotificationsViewModel } from './use-notifications-view-model';

import type { NotificationItem } from './notifications-data-source';

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
}: NotificationListScreenProps) {
  const vm = useNotificationsViewModel(role);

  return (
    <View style={styles.root}>
      <AppHeader onPressNotifications={onPressNotifications} onPressAvatar={onPressAvatar} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.editorial}>
          <PageTitle eyebrow={eyebrow} title={title} body={body} />

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
                    <NotificationRow key={item.id} item={item} onPress={() => vm.markRead(item.id)} />
                  ))}
                </View>
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
  pressed: { opacity: 0.85 },
  bottomSpacer: { height: spacing[2] },
});
