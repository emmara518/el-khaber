/**
 * Technician route group layout — SHELL ONLY (Phase 1).
 *
 * Exposes the structural destinations for the future Technician
 * workspace (الرئيسية, الطلبات, الخدمات, الرسائل, الملف الشخصي)
 * through the shared `RoleTabBar` visual system. No product
 * functionality lives behind these tabs yet; every destination
 * renders an explicit `ShellPlaceholder`.
 */

import { color } from '@khabir/ui-tokens';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleTabBar, type ShellTab } from '@/features/shell/role-tab-bar';

const TABS: ReadonlyArray<ShellTab> = [
  { id: 'home', labelAr: 'الرئيسية', icon: '🏠' },
  { id: 'orders', labelAr: 'الطلبات', icon: '📋' },
  { id: 'services', labelAr: 'الخدمات', icon: '🛠️' },
  { id: 'messages', labelAr: 'الرسائل', icon: '💬' },
  { id: 'profile', labelAr: 'الملف الشخصي', icon: '👤' },
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
          tabs={TABS}
          active={active}
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

function tabIdForPathname(pathname: string): string {
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/services')) return 'services';
  if (pathname.includes('/messages')) return 'messages';
  if (pathname.includes('/profile')) return 'profile';
  return 'home';
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
