/**
 * Merchant route group layout.
 *
 * Destinations (الرئيسية, المنتجات, الرسائل, الملف الشخصي) through the shared
 * `RoleTabBar` navy surface — the same bottom-navigation visual system as the
 * Customer and Technician experiences. Active state comes from the tested
 * `merchant-tab-routing` module.
 */

import { color } from '@khabir/ui-tokens';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tabIdForPathname } from '@/features/merchant/merchant-tab-routing';
import { RoleTabBar, type ShellTab } from '@/features/shell/role-tab-bar';

const TABS: ReadonlyArray<ShellTab> = [
  { id: 'home', labelAr: 'الرئيسية', icon: 'home' },
  { id: 'products', labelAr: 'المنتجات', icon: 'package' },
  { id: 'messages', labelAr: 'الرسائل', icon: 'message-circle' },
  { id: 'profile', labelAr: 'الملف الشخصي', icon: 'user' },
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
