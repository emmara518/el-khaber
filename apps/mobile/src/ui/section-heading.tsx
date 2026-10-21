/**
 * SectionHeading — the shared section heading (eyebrow → title →
 * optional body) with a single trailing action. Mirrors the Customer
 * HomeSection rhythm so every role's sections read identically.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './icon';
import { type } from './typography';

interface SectionHeadingProps {
  title: string;
  eyebrow?: string;
  body?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  actionAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeading({
  title,
  eyebrow,
  body,
  actionLabel,
  onPressAction,
  actionAccessibilityLabel,
  style,
}: SectionHeadingProps) {
  return (
    <View style={[styles.heading, style]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      {actionLabel && onPressAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onPressAction}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Icon name="chevron-left" size={16} color={color.brand.navy} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  copy: { flex: 1, minWidth: 0, gap: spacing[1] },
  eyebrow: { ...type.label, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  title: { ...type.h3, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  action: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    minHeight: 32,
  },
  pressed: { opacity: 0.6 },
  actionText: { ...type.label, color: color.brand.navy, writingDirection: 'rtl' },
});
