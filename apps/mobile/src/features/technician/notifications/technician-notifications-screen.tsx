/**
 * Technician Notifications center — shared role-neutral notification list.
 */

import { useRouter } from 'expo-router';

import { NotificationListScreen } from '@/features/notifications/notification-list-screen';

export default function TechnicianNotificationsScreen() {
  const router = useRouter();
  return (
    <NotificationListScreen
      role="technician"
      eyebrow="التنبيهات"
      title="الإشعارات"
      body="أحدث التحديثات على طلباتك ورسائل العملاء."
      emptyTitle="لا توجد إشعارات"
      emptyBody="ستظهر هنا تحديثات طلباتك ورسائل العملاء."
      onPressNotifications={() => router.push('/(technician)/notifications')}
      onPressAvatar={() => router.push('/(technician)/profile')}
    />
  );
}
