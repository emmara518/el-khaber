import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Bootstrap screen. Confirms the Expo app boots successfully.
 * Product screens (Onboarding, Role Selection, Customer Home, etc.) are
 * added in later tasks per docs/02_PRODUCT.md and docs/03_USER_FLOWS.md.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>الخبير</Text>
      <Text style={styles.subtitle}>Al-Khabir · bootstrap</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
  },
  title: {
    color: color.brand.navy,
    fontSize: typography.size.display,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[2],
  },
});
