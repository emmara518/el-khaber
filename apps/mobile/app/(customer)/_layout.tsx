import { color } from '@khabir/ui-tokens';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/use-i18n';

/**
 * Customer route group layout.
 *
 * Implements the bottom tab bar defined in
 * `docs/04_UI_UX.md` §10 (الرئيسية, المفضلة, طلب خدمة, طلباتي, حسابي).
 * The exact tab labels and order are taken from the approved visual
 * reference for the Customer Home (الرئيسية, طلبات, صيانة, المحادثات,
 * الملف الشخصي) which is the canonical set for the current MVP.
 *
 * The `expo-router/tabs` Tabs component handles native tab UI; we
 * wrap it in a RTL-friendly container and expose the active-tab
 * state to the underlying screens via the `useSegments` / route
 * params API (expo-router handles this automatically).
 */
export default function CustomerTabsLayout() {
  const { rtl } = useI18n();
  return (
    <View style={[styles.root, rtl ? styles.rtl : styles.ltr]}>
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: color.brand.gold,
            tabBarInactiveTintColor: color.text.secondary,
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
          <Tabs.Screen name="requests" options={{ title: 'طلبات' }} />
          <Tabs.Screen name="maintenance" options={{ title: 'صيانة' }} />
          <Tabs.Screen name="messages" options={{ title: 'المحادثات' }} />
          <Tabs.Screen name="profile" options={{ title: 'الملف الشخصي' }} />
        </Tabs>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
  },
  rtl: {
    direction: 'rtl',
  },
  ltr: {
    direction: 'ltr',
  },
  safe: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: color.surface.base,
    borderTopColor: color.border.default,
    height: 64,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
