import { color, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ReactNode } from 'react';

import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';


interface HomeSectionProps {
  title: string;
  eyebrow?: string;
  body?: string;
  /** Optional trailing "view all" affordance — only pass when a real
   * destination exists. */
  actionLabel?: string;
  onPressAction?: () => void;
  actionAccessibilityLabel?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Home section rhythm: one shared heading treatment (eyebrow → title →
 * optional body) and a single trailing action. Keeps every Home section
 * visually consistent and preserves the screen's breathing room.
 */
export function HomeSection({
  title,
  eyebrow,
  body,
  actionLabel,
  onPressAction,
  actionAccessibilityLabel,
  children,
  style,
}: HomeSectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.heading}>
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing[6],
    gap: spacing[4],
    direction: 'rtl',
  },
  heading: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  eyebrow: {
    ...type.label,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  title: {
    ...type.h3,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  action: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    minHeight: 32,
  },
  pressed: {
    opacity: 0.6,
  },
  actionText: {
    ...type.label,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
});
