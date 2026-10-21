/**
 * Onboarding progress dots (RTL-symmetric, token-styled).
 *
 * Two-step explanatory tour: the active step is a filled gold dot, the
 * remaining steps are muted solid dots. Position is communicated by the
 * gold fill + larger size (never by colour alone — the group also carries
 * a `progressbar` role and an accessible "خطوة N من M" label).
 *
 * The row is centre-aligned. In the forced-RTL app the first step renders
 * at the right edge, matching Arabic reading order.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { StyleSheet, View } from 'react-native';

export function OnboardingDots({ position, total = 2 }: { position: number; total?: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={total > 1 ? `خطوة ${String(position + 1)} من ${String(total)}` : `خطوة ${String(position + 1)}`}
      style={styles.root}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          accessibilityRole="none"
          importantForAccessibility="no"
          style={[styles.dot, i === position && styles.active]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  active: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: color.brand.gold,
  },
});
