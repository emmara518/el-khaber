/**
 * Merchant Notifications center — shared role-neutral notification list.
 * Real API-backed (GET /notifications, read / read-all). In-app only.
 */

import { useRouter } from 'expo-router';

import { NotificationListScreen } from '@/features/notifications/notification-list-screen';

export default function MerchantNotificationsScreen() {
  const router = useRouter();
  return (
    <NotificationListScreen
      role="merchant"
      eyebrow="التنبيهات"
      title="الإشعارات"
      body="أحدث التحديثات على متجرك ومنتجاتك."
      emptyTitle="لا توجد إشعارات"
      emptyBody="ستظهر هنا تحديثات متجرك ومنتجاتك."
      onPressNotifications={() => router.push('/(merchant)/notifications')}
      onPressAvatar={() => router.push('/(merchant)/profile')}
    />
  );
}
