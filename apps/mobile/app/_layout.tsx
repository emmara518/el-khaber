import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useI18n } from '../src/i18n/use-i18n';

/**
 * Root layout. The mobile app is a single multi-role application;
 * the Customer route group is the default for this task
 * (Task #003). Technician and Merchant route groups will be added
 * in later tasks per docs/01_PROJECT.md §4.
 *
 * RTL is enforced for Arabic: the I18nManager is forced to RTL on
 * first mount, and the safe-area / status-bar styling is dark
 * because the Customer Home hero is a dark navy bar.
 */
export default function RootLayout() {
  // Force RTL once on mount. The product's primary language is
  // Arabic (docs/02_PRODUCT.md §3.3). Re-applying is a no-op.
  if (Platform.OS !== 'web' && I18nManager.isRTL === false) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
  useI18n();
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FFFFFF' },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
