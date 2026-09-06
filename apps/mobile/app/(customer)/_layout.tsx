import { color } from '@khabir/ui-tokens';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomerTabBar, type CustomerTabId } from '@/features/customer/customer-tab-bar';

/**
 * Customer route group layout.
 *
 * Uses the reusable `CustomerTabBar` for the bottom navigation defined
 * in `docs/04_UI_UX.md` §10 and the approved visual reference
 * (الرئيسية, طلبات, صيانة, المحادثات, الملف الشخصي). Expo Router owns
 * navigation state through `Slot`; this layout only renders the active
 * route and the shared tab bar.
 *
 * Navigation uses group-qualified paths (`/(customer)/…`) so the
 * role-aware root shell never resolves a Customer tab into another
 * role's group: Technician/Merchant shells intentionally expose the
 * same URL segments (e.g. `/messages`, `/profile`) per Expo Router
 * group semantics, and the active group disambiguates them.
 */
export default function CustomerTabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const active = tabIdForPathname(pathname);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <View style={styles.content}>
          <Slot />
        </View>
        <CustomerTabBar
          active={active}
          onChange={(id) => {
            router.replace(id === 'home' ? '/(customer)' : `/(customer)/${id}`);
          }}
        />
      </SafeAreaView>
    </View>
  );
}

function tabIdForPathname(pathname: string): CustomerTabId {
  if (pathname === '/requests' || pathname.startsWith('/requests/')) return 'requests';
  if (pathname === '/maintenance' || pathname.startsWith('/maintenance/')) return 'maintenance';
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return 'messages';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
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
