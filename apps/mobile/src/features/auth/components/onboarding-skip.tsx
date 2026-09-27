/**
 * Onboarding Skip affordance — the shared top-corner pill used by the
 * Splash and both onboarding slides. Kept as one primitive so the
 * composition cannot drift between screens.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text } from 'react-native';

import { type } from '@/ui/typography';

export function OnboardingSkip({
  onPress,
  label = 'تخطي',
  accessibilityLabel = 'تخطي الجولة التعريفية',
}: {
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...type.bodyMedium,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pressed: {
    opacity: 0.9,
  },
});
