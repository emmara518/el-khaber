/**
 * Merchant route group layout — SHELL ONLY (Phase 1).
 *
 * Structural destinations for the future Merchant workspace
 * (الرئيسية, المنتجات, الرسائل, الملف الشخصي) through the shared
 * `RoleTabBar` visual system. No catalog/order/transaction logic —
 * every destination renders an explicit `ShellPlaceholder`.
 */

import { color } from '@khabir/ui-tokens';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleTabBar, type ShellTab } from '@/features/shell/role-tab-bar';

const TABS: ReadonlyArray<ShellTab> = [
  { id: 'home', labelAr: 'الرئيسية', icon: '🏠' },
  { id: 'products', labelAr: 'المنتجات', icon: '📦' },
  { id: 'messages', labelAr: 'الرسائل', icon: '💬' },
  { id: 'profile', labelAr: 'الملف الشخصي', icon: '👤' },
];

export default function MerchantTabsLayout() {
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
            router.replace(merchantTarget(id));
          }}
        />
      </SafeAreaView>
    </View>
  );
}

function merchantTarget(
  id: string,
): '/(merchant)' | '/(merchant)/products' | '/(merchant)/messages' | '/(merchant)/profile' {
  if (id === 'products') return '/(merchant)/products';
  if (id === 'messages') return '/(merchant)/messages';
  if (id === 'profile') return '/(merchant)/profile';
  return '/(merchant)';
}

function tabIdForPathname(pathname: string): string {
  if (pathname.includes('/products')) return 'products';
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
