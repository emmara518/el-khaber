/**
 * Onboarding progress dots (RTL-symmetric, token-styled).
 *
 * Two-step explanatory tour: the active dot stretches into a navy pill,
 * upcoming dots stay hairline rings. The group is center-aligned with
 * generous spacing; the active state communicates position with a gold
 * filled capsule while inactive dots are subtle rings. Pure native Views
 * — the shape change alone communicates position, supported by gentle
 * focus indicator for accessibility.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §6, Task #002 §17.
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
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: color.border.default,
    backgroundColor: color.surface.subtle,
    transitionProperty: 'width,borderColor,backgroundColor',
    transitionDuration: '150ms',
  },
  active: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: color.brand.gold,
    backgroundColor: color.brand.gold,
    borderWidth: 2,
  },
});