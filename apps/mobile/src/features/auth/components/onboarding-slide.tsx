/**
 * Onboarding slide (RTL, token-styled).
 *
 * Explanatory only — no data collection (docs/03_USER_FLOWS.md §3).
 * Appliance-specialized emoji visuals keep the one-product identity
 * without adding image assets in Phase 1.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

export function OnboardingSlide({
  visual,
  visualLabel,
  title,
  body,
}: {
  visual: string;
  visualLabel: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.root}>
      <View
        accessibilityRole="image"
        accessibilityLabel={visualLabel}
        style={styles.visual}
      >
        <Text style={styles.emoji}>{visual}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  visual: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: color.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: spacing[6],
  },
  body: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: spacing[3],
    lineHeight: 26,
  },
});
