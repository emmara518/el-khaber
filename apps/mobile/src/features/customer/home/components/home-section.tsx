import { spacing } from '@khabir/ui-tokens';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ReactNode } from 'react';

import { SectionHeading } from '@/ui';

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
 * Home section rhythm: the shared `SectionHeading` (eyebrow → title →
 * optional body → single trailing action) plus the vertical rhythm that
 * separates Home sections. The heading itself is delegated so every
 * role reads identically (no duplicated heading implementation).
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
      <SectionHeading
        title={title}
        eyebrow={eyebrow}
        body={body}
        actionLabel={actionLabel}
        onPressAction={onPressAction}
        actionAccessibilityLabel={actionAccessibilityLabel}
      />
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
});
