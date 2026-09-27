/**
 * Social provider buttons (Google / Facebook).
 *
 * Provider glyphs come from the installed Ionicons brand set — no custom
 * or generated provider artwork. The buttons are visually secondary to the
 * EL-KHABIR identity and only report the tapped provider upward; the screen
 * owns what actually happens (there is no OAuth infrastructure yet, so the
 * screen surfaces an honest "not available" state rather than faking auth).
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type } from '@/ui/typography';

export type SocialProvider = 'google' | 'facebook';

const PROVIDER: Record<SocialProvider, { label: string; icon: 'logo-google' | 'logo-facebook'; tint: string }> = {
  google: { label: 'جوجل', icon: 'logo-google', tint: '#4285F4' },
  facebook: { label: 'فيسبوك', icon: 'logo-facebook', tint: '#1877F2' },
};

export function SocialAuthButtons({
  onProvider,
  disabled = false,
}: {
  onProvider: (provider: SocialProvider) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {(['google', 'facebook'] as const).map((provider) => {
        const config = PROVIDER[provider];
        return (
          <Pressable
            key={provider}
            accessibilityRole="button"
            accessibilityLabel={`المتابعة باستخدام ${config.label}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => onProvider(provider)}
            style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Ionicons name={config.icon} size={22} color={config.tint} />
            <Text style={styles.label}>{config.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: spacing[3],
  },
  button: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
  },
  label: {
    ...type.bodyMedium,
    color: color.text.primary,
    writingDirection: 'rtl',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
