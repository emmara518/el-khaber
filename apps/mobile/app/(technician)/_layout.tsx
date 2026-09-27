/**
 * Technician route group layout.
 *
 * Destinations (الرئيسية, الطلبات, الخدمات, الرسائل, الملف الشخصي)
 * through the shared `RoleTabBar` in its Customer-parity `navy` surface
 * (same bottom-navigation visual system as the Customer experience).
 * Active state comes from the tested `technician-tab-routing` module.
 */

import { color } from '@khabir/ui-tokens';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleTabBar, type ShellTab } from '@/features/shell/role-tab-bar';
import { tabIdForPathname } from '@/features/technician/technician-tab-routing';

const TABS: ReadonlyArray<ShellTab> = [
  { id: 'home', labelAr: 'الرئيسية', icon: 'home', asset: 'home' },
  { id: 'orders', labelAr: 'الطلبات', icon: 'clipboard', asset: 'my-requests' },
  { id: 'services', labelAr: 'الخدمات', icon: 'tool', asset: 'maintenance' },
  { id: 'messages', labelAr: 'الرسائل', icon: 'message-circle', asset: 'messages' },
  { id: 'profile', labelAr: 'الملف الشخصي', icon: 'user', asset: 'profile' },
];

export default function TechnicianTabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const active = tabIdForPathname(pathname);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <View style={styles.content}>
          <Slot />
        </View>
        <RoleTabBar
          surface="navy"
          tabs={TABS}
          active={active ?? ''}
          onChange={(id) => {
            router.replace(technicianTarget(id));
          }}
        />
      </SafeAreaView>
    </View>
  );
}

function technicianTarget(
  id: string,
): '/(technician)' | '/(technician)/orders' | '/(technician)/services' | '/(technician)/messages' | '/(technician)/profile' {
  if (id === 'orders') return '/(technician)/orders';
  if (id === 'services') return '/(technician)/services';
  if (id === 'messages') return '/(technician)/messages';
  if (id === 'profile') return '/(technician)/profile';
  return '/(technician)';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
