/**
 * Technician Notifications center (T-H) — Customer visual language.
 *
 * AppHeader → PageTitle → notification cards through the shared
 * notifications view model (role-agnostic, identity from the JWT).
 * No cinematic header.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NotificationItem } from '@/features/notifications/notifications-data-source';

import { useNotificationsViewModel } from '@/features/notifications/use-notifications-view-model';
import { AppHeader, BrandImage, Card, Icon, ListEmpty, ListError, ListLoading, PageTitle } from '@/ui';
import { type } from '@/ui/typography';

export default function TechnicianNotificationsScreen() {
  const router = useRouter();
  const vm = useNotificationsViewModel('technician');

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(technician)/notifications')}
        onPressAvatar={() => router.push('/(technician)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle eyebrow="التنبيهات" title="الإشعارات" body="أحدث التحديثات على طلباتك ورسائل العملاء." />

        {vm.status === 'loading' ? <ListLoading label="جارٍ تحميل الإشعارات" brandAsset="toolbox" /> : null}
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
              title="لا توجد إشعارات"
              body="ستظهر هنا تحديثات طلباتك ورسائل العملاء."
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
            <BrandImage name={item.read ? 'info' : 'notifications'} size={22} />
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
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
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
  card: { gap: spacing[2] },
  row: { flexDirection: 'row', direction: 'rtl', alignItems: 'flex-start', gap: spacing[3] },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileRead: { backgroundColor: color.surface.subtle },
  tileUnread: { backgroundColor: color.surface.base },
  middle: { flex: 1, gap: 2 },
  title: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  time: { ...type.caption, color: color.text.secondary, marginTop: spacing[1], textAlign: 'right' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: color.brand.navy,
    marginTop: spacing[1],
  },
  pressed: { opacity: 0.85 },
  bottomSpacer: { height: spacing[2] },
});
