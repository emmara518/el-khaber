/**
 * Customer Notifications center — shared role-neutral notification list.
 * Real API-backed (GET /notifications, read / read-all). In-app only.
 */

import { useRouter } from 'expo-router';

import { NotificationListScreen } from '@/features/notifications/notification-list-screen';

export default function NotificationsScreen() {
  const router = useRouter();
  return (
    <NotificationListScreen
      role="customer"
      eyebrow="التنبيهات"
      title="الإشعارات"
      body="أحدث التحديثات على طلباتك ومحادثاتك واشتراكك."
      emptyTitle="لا توجد إشعارات"
      emptyBody="ستظهر هنا تحديثات طلباتك ورسائل الفنيين."
      onPressNotifications={() => router.push('/(customer)/notifications')}
      onPressAvatar={() => router.push('/(customer)/profile')}
    />
  );
}
